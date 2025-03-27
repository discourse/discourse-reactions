import { cancel, later, run, schedule } from "@ember/runloop";
import { createPopper } from "@popperjs/core";
import $ from "jquery";
import { Promise } from "rsvp";
import { isTesting } from "discourse/lib/environment";
import { emojiUrlFor } from "discourse/lib/text";
import { createWidget } from "discourse/widgets/widget";
import { i18n } from "discourse-i18n";
import CustomReaction from "../models/discourse-reactions-custom-reaction";

const VIBRATE_DURATION = 5;

let _popperPicker;
let _currentReactionWidget;

export function resetCurrentReaction() {
  _currentReactionWidget = null;
}

function buildFakeReaction(reactionId) {
  const img = document.createElement("img");
  img.src = emojiUrlFor(reactionId);
  img.classList.add(
    "btn-toggle-reaction-emoji",
    "reaction-button",
    "fake-reaction"
  );

  return img;
}

function moveReactionAnimation(
  postContainer,
  reactionId,
  startPosition,
  endPosition,
  complete
) {
  if (isTesting()) {
    return;
  }

  const fakeReaction = buildFakeReaction(reactionId);
  const reactionButton = postContainer.querySelector(".reaction-button");

  reactionButton.appendChild(fakeReaction);

  let done = () => {
    fakeReaction.remove();
    complete();
  };

  fakeReaction.style.top = startPosition;
  fakeReaction.style.opacity = 0;

  $(fakeReaction).animate(
    {
      top: endPosition,
      opacity: 1,
    },
    {
      duration: 350,
      complete: done,
    },
    "swing"
  );
}

function addReaction(list, reactionId, complete) {
  moveReactionAnimation(list, reactionId, "-50px", "8px", complete);
}

function dropReaction(list, reactionId, complete) {
  moveReactionAnimation(list, reactionId, "8px", "42px", complete);
}

function scaleReactionAnimation(mainReaction, start, end, complete) {
  if (isTesting()) {
    return run(this, complete);
  }

  return $(mainReaction)
    .stop()
    .css("textIndent", start)
    .animate(
      { textIndent: end },
      {
        complete,
        step(now) {
          $(this)
            .css("transform", `scale(${now})`)
            .addClass("far-heart")
            .removeClass("heart");
        },
        duration: 150,
      },
      "linear"
    );
}

export default createWidget("discourse-reactions-actions", {
  tagName: "div.discourse-reactions-actions",
  services: ["dialog"],

  defaultState() {
    return {
      reactionsPickerExpanded: false,
      statePanelExpanded: false,
    };
  },

  buildKey: (attrs) =>
    `discourse-reactions-actions-${attrs.post.id}-${attrs.position || "right"}`,

  buildClasses(attrs) {
    if (!attrs.post.reactions) {
      return;
    }

    const post = attrs.post;
    const hasReactions = post.reactions.length;
    const hasReacted = post.current_user_reaction;
    const customReactionUsed =
      post.reactions.length &&
      post.reactions.filter(
        (reaction) =>
          reaction.id !==
          this.siteSettings.discourse_reactions_reaction_for_like
      ).length;
    const classes = [];

    if (customReactionUsed) {
      classes.push("custom-reaction-used");
    }

    if (post.yours) {
      classes.push("my-post");
    }

    if (hasReactions) {
      classes.push("has-reactions");
    }

    if (hasReacted) {
      classes.push("has-reacted");
    }

    if (post.current_user_used_main_reaction) {
      classes.push("has-used-main-reaction");
    }

    if (
      (!post.current_user_reaction || post.current_user_reaction.can_undo) &&
      post.likeAction?.canToggle
    ) {
      classes.push("can-toggle-reaction");
    }

    return classes;
  },

  toggleReactions(event) {
    if (!this.state.reactionsPickerExpanded) {
      if (this.state.statePanelExpanded) {
        this.scheduleExpand("expandReactionsPicker");
      } else {
        this.expandReactionsPicker(event);
      }
    }
  },

  touchStart() {
    this._validTouch = true;

    cancel(this._touchTimeout);

    if (this.capabilities.touch) {
      document.documentElement?.classList?.toggle(
        "discourse-reactions-no-select",
        true
      );

      this._touchStartAt = Date.now();
      this._touchTimeout = later(() => {
        this._touchStartAt = null;
        this.toggleReactions();
      }, 400);
      return false;
    }
  },

  touchMove() {
    // if users move while touching we consider it as a scroll and don't want to
    // trigger the reaction or the picker
    this._validTouch = false;
    cancel(this._touchTimeout);
  },

  touchEnd(event) {
    cancel(this._touchTimeout);

    if (!this._validTouch) {
      return;
    }

    if (this.capabilities.touch) {
      if (event.originalEvent.changedTouches.length) {
        const endTarget = document.elementFromPoint(
          event.originalEvent.changedTouches[0].clientX,
          event.originalEvent.changedTouches[0].clientY
        );

        if (endTarget) {
          const parentNode = endTarget.parentNode;

          if (endTarget.classList.contains("pickable-reaction")) {
            endTarget.click();
            return;
          } else if (
            parentNode &&
            parentNode.classList.contains("pickable-reaction")
          ) {
            parentNode.click();
            return;
          }
        }
      }

      const duration = Date.now() - (this._touchStartAt || 0);
      this._touchStartAt = null;
      if (duration > 400) {
        if (
          event.originalEvent &&
          event.originalEvent.target &&
          event.originalEvent.target.classList.contains(
            "discourse-reactions-reaction-button"
          )
        ) {
          this.toggleReactions(event);
        }
      } else {
        if (
          event.target &&
          (event.target.classList.contains(
            "discourse-reactions-reaction-button"
          ) ||
            event.target.classList.contains("reaction-button"))
        ) {
          this.toggleFromButton({
            reaction: this.attrs.post.current_user_reaction
              ? this.attrs.post.current_user_reaction.id
              : this.siteSettings.discourse_reactions_reaction_for_like,
          });
        }
      }
    }
  },

  toggle(params) {
    if (!this.currentUser) {
      if (this.attrs.showLogin) {
        this.attrs.showLogin();
        return;
      }
    }

    if (
      !this.attrs.post.current_user_reaction ||
      (this.attrs.post.current_user_reaction.can_undo &&
        this.attrs.post.likeAction.canToggle)
    ) {
      if (this.capabilities.userHasBeenActive && this.capabilities.canVibrate) {
        navigator.vibrate(VIBRATE_DURATION);
      }

      const pickedReaction = document.querySelector(
        `[data-post-id="${
          params.postId
        }"] .discourse-reactions-picker .pickable-reaction.${CSS.escape(
          params.reaction
        )} .emoji`
      );

      const scales = [1.0, 1.75];
      return new Promise((resolve) => {
        scaleReactionAnimation(pickedReaction, scales[0], scales[1], () => {
          scaleReactionAnimation(pickedReaction, scales[1], scales[0], () => {
            const post = this.attrs.post;
            const postContainer = document.querySelector(
              `[data-post-id="${params.postId}"]`
            );

            if (
              post.current_user_reaction &&
              post.current_user_reaction.id === params.reaction
            ) {
              this.toggleReaction(params);

              later(() => {
                dropReaction(postContainer, params.reaction, () => {
                  return CustomReaction.toggle(this.attrs.post, params.reaction)
                    .then(resolve)
                    .catch((e) => {
                      this.dialog.alert(this._extractErrors(e));
                      this._rollbackState(post);
                    });
                });
              }, 100);
            } else {
              addReaction(postContainer, params.reaction, () => {
                this.toggleReaction(params);

                CustomReaction.toggle(this.attrs.post, params.reaction)
                  .then(resolve)
                  .catch((e) => {
                    this.dialog.alert(this._extractErrors(e));
                    this._rollbackState(post);
                  });
              });
            }
          });
        });
      }).finally(() => {
        this.collapseAllPanels();
        this.scheduleRerender();
      });
    }
  },

  toggleReaction(attrs) {
    this.collapseAllPanels();

    if (
      this.attrs.post.current_user_reaction &&
      !this.attrs.post.current_user_reaction.can_undo &&
      !this.attrs.post.likeAction.canToggle
    ) {
      return;
    }

    const post = this.attrs.post;

    if (post.current_user_reaction) {
      post.reactions.every((reaction, index) => {
        if (
          reaction.count <= 1 &&
          reaction.id === post.current_user_reaction.id
        ) {
          post.reactions.splice(index, 1);
          return false;
        } else if (reaction.id === post.current_user_reaction.id) {
          post.reactions[index].count -= 1;

          return false;
        }

        return true;
      });
    }

    if (
      attrs.reaction &&
      (!post.current_user_reaction ||
        attrs.reaction !== post.current_user_reaction.id)
    ) {
      let isAvailable = false;

      post.reactions.every((reaction, index) => {
        if (reaction.id === attrs.reaction) {
          post.reactions[index].count += 1;
          isAvailable = true;
          return false;
        }
        return true;
      });

      if (!isAvailable) {
        const newReaction = {
          id: attrs.reaction,
          type: "emoji",
          count: 1,
        };

        const tempReactions = Object.assign([], post.reactions);

        tempReactions.push(newReaction);

        //sorts reactions and get index of new reaction
        const newReactionIndex = tempReactions
          .sort((reaction1, reaction2) => {
            if (reaction1.count > reaction2.count) {
              return -1;
            }
            if (reaction1.count < reaction2.count) {
              return 1;
            }

            //if count is same, sort it by id
            if (reaction1.id > reaction2.id) {
              return 1;
            }
            if (reaction1.id < reaction2.id) {
              return -1;
            }
          })
          .indexOf(newReaction);

        post.reactions.splice(newReactionIndex, 0, newReaction);
      }

      if (!post.current_user_reaction) {
        post.reaction_users_count += 1;
      }

      post.current_user_reaction = {
        id: attrs.reaction,
        type: "emoji",
        can_undo: true,
      };
    } else {
      post.reaction_users_count -= 1;
      post.current_user_reaction = null;
    }

    if (
      post.current_user_reaction &&
      post.current_user_reaction.id ===
        this.siteSettings.discourse_reactions_reaction_for_like
    ) {
      post.current_user_used_main_reaction = true;
    } else {
      post.current_user_used_main_reaction = false;
    }
  },

  toggleFromButton(attrs) {
    if (!this.currentUser) {
      if (this.attrs.showLogin) {
        this.attrs.showLogin();
        return;
      }
    }

    this.collapseAllPanels();

    const mainReactionName =
      this.siteSettings.discourse_reactions_reaction_for_like;
    const post = this.attrs.post;
    const current_user_reaction = post.current_user_reaction;

    if (
      post.likeAction &&
      !(post.likeAction.canToggle || post.likeAction.can_undo)
    ) {
      return;
    }

    if (
      this.attrs.post.current_user_reaction &&
      !this.attrs.post.current_user_reaction.can_undo
    ) {
      return;
    }

    if (!this.currentUser || post.user_id === this.currentUser.id) {
      return;
    }

    if (this.capabilities.userHasBeenActive && this.capabilities.canVibrate) {
      navigator.vibrate(VIBRATE_DURATION);
    }

    if (current_user_reaction && current_user_reaction.id === attrs.reaction) {
      this.toggleReaction(attrs);
      return CustomReaction.toggle(this.attrs.post, attrs.reaction).catch(
        (e) => {
          this.dialog.alert(this._extractErrors(e));
          this._rollbackState(post);
        }
      );
    }

    let selector;
    if (
      post.reactions &&
      post.reactions.length === 1 &&
      post.reactions[0].id === mainReactionName
    ) {
      selector = `[data-post-id="${this.attrs.post.id}"] .discourse-reactions-double-button .discourse-reactions-reaction-button .d-icon`;
    } else {
      if (!attrs.reaction || attrs.reaction === mainReactionName) {
        selector = `[data-post-id="${this.attrs.post.id}"] .discourse-reactions-reaction-button .d-icon`;
      } else {
        selector = `[data-post-id="${this.attrs.post.id}"] .discourse-reactions-reaction-button .reaction-button .btn-toggle-reaction-emoji`;
      }
    }

    const mainReaction = document.querySelector(selector);

    const scales = [1.0, 1.5];
    return new Promise((resolve) => {
      scaleReactionAnimation(mainReaction, scales[0], scales[1], () => {
        scaleReactionAnimation(mainReaction, scales[1], scales[0], () => {
          this.toggleReaction(attrs);

          let toggleReaction =
            attrs.reaction && attrs.reaction !== mainReactionName
              ? attrs.reaction
              : this.siteSettings.discourse_reactions_reaction_for_like;

          CustomReaction.toggle(this.attrs.post, toggleReaction)
            .then(resolve)
            .catch((e) => {
              this.dialog.alert(this._extractErrors(e));
              this._rollbackState(post);
            });
        });
      });
    });
  },

  cancelCollapse() {
    cancel(this._collapseHandler);
  },

  cancelExpand() {
    cancel(this._expandHandler);
  },

  scheduleExpand(handler) {
    this.cancelExpand();

    this._expandHandler = later(this, this[handler], 250);
  },

  scheduleCollapse(handler) {
    this.cancelCollapse();

    this._collapseHandler = later(this, this[handler], 500);
  },

  buildId: (attrs) =>
    `discourse-reactions-actions-${attrs.post.id}-${attrs.position || "right"}`,

  clickOutside() {
    if (this.state.reactionsPickerExpanded || this.state.statePanelExpanded) {
      this.collapseAllPanels();
    }
  },

  expandReactionsPicker() {
    cancel(this._collapseHandler);
    _currentReactionWidget?.collapseAllPanels();
    this.state.statePanelExpanded = false;
    this.state.reactionsPickerExpanded = true;
    this.scheduleRerender();
    this._setupPopper([
      ".discourse-reactions-reaction-button",
      ".discourse-reactions-picker",
    ]);
  },

  expandStatePanel() {
    cancel(this._collapseHandler);
    _currentReactionWidget?.collapseAllPanels();
    this.state.statePanelExpanded = true;
    this.state.reactionsPickerExpanded = false;
    this.scheduleRerender();
    this._setupPopper([
      ".discourse-reactions-counter",
      ".discourse-reactions-state-panel",
    ]);
  },

  collapseStatePanel() {
    cancel(this._collapseHandler);
    this._collapseHandler = null;
    this.state.statePanelExpanded = false;
    this.scheduleRerender();
  },

  collapseReactionsPicker() {
    cancel(this._collapseHandler);
    this._collapseHandler = null;
    this.state.reactionsPickerExpanded = false;
    this.scheduleRerender();
  },

  collapseAllPanels() {
    cancel(this._collapseHandler);
    document.documentElement?.classList?.toggle(
      "discourse-reactions-no-select",
      false
    );
    this._collapseHandler = null;
    this.state.statePanelExpanded = false;
    this.state.reactionsPickerExpanded = false;
    this.scheduleRerender();
  },

  updatePopperPosition() {
    _popperPicker?.update();
  },

  html(attrs) {
    const post = attrs.post;
    const items = [];
    const mainReaction =
      this.siteSettings.discourse_reactions_reaction_for_like;

    const payload = Object.assign({}, attrs, {
      reactionsPickerExpanded: this.state.reactionsPickerExpanded,
      statePanelExpanded: this.state.statePanelExpanded,
    });

    if (this.currentUser && post.user_id !== this.currentUser.id) {
      items.push(this.attach("discourse-reactions-picker", payload));
    }

    if (attrs.position === "left") {
      items.push(this.attach("discourse-reactions-counter", payload));
      return items;
    }

    if (
      post.reactions &&
      post.reactions.length === 1 &&
      post.reactions[0].id === mainReaction
    ) {
      items.push(this.attach("discourse-reactions-double-button", payload));
    } else if (this.site.mobileView) {
      if (!post.yours) {
        items.push(this.attach("discourse-reactions-counter", payload));
        items.push(this.attach("discourse-reactions-reaction-button", payload));
      } else if (post.yours && post.reactions && post.reactions.length) {
        items.push(this.attach("discourse-reactions-counter", payload));
      }
    } else {
      if (!post.yours) {
        items.push(this.attach("discourse-reactions-reaction-button", payload));
      }
    }

    return items;
  },

  _setupPopper(selectors) {
    schedule("afterRender", () => {
      const position = this.attrs.position || "right";
      const id = this.attrs.post.id;
      const trigger = document.querySelector(
        `#discourse-reactions-actions-${id}-${position} ${selectors[0]}`
      );
      const popper = document.querySelector(
        `#discourse-reactions-actions-${id}-${position} ${selectors[1]}`
      );

      _popperPicker?.destroy();
      _popperPicker = this._applyPopper(trigger, popper);
      _currentReactionWidget = this;
    });
  },

  _applyPopper(button, picker) {
    return createPopper(button, picker, {
      placement: "top",
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, -5],
          },
        },
        {
          name: "preventOverflow",
          options: {
            padding: 5,
          },
        },
      ],
    });
  },

  _rollbackState(post) {
    const current_user_reaction = post.current_user_reaction;
    const current_user_used_main_reaction =
      post.current_user_used_main_reaction;
    const reactions = Object.assign([], post.reactions);
    const reaction_users_count = post.reaction_users_count;

    post.current_user_reaction = current_user_reaction;
    post.current_user_used_main_reaction = current_user_used_main_reaction;
    post.reactions = reactions;
    post.reaction_users_count = reaction_users_count;
    this.scheduleRerender();
  },

  _extractErrors(e) {
    const xhr = e.xhr || e.jqXHR;

    if (!xhr || !xhr.status) {
      return i18n("errors.desc.network");
    }

    if (
      xhr.status === 429 &&
      xhr.responseJSON &&
      xhr.responseJSON.errors &&
      xhr.responseJSON.errors[0]
    ) {
      return xhr.responseJSON.errors[0];
    } else if (xhr.status === 403) {
      return i18n("discourse_reactions.reaction.forbidden");
    } else {
      return i18n("errors.desc.unknown");
    }
  },
});
