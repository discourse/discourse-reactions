import { emojiUrlFor } from "discourse/lib/text";
import { Promise } from "rsvp";
import { next, run } from "@ember/runloop";
import { createWidget } from "discourse/widgets/widget";
import CustomReaction from "../models/discourse-reactions-custom-reaction";
import { isTesting } from "discourse-common/config/environment";
import { later, cancel } from "@ember/runloop";
import I18n from "I18n";
import bootbox from "bootbox";

const VIBRATE_DURATION = 5;

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
      opacity: 1
    },
    {
      duration: 350,
      complete: done
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
        duration: 150
      },
      "linear"
    );
}

export default createWidget("discourse-reactions-actions", {
  tagName: "div.discourse-reactions-actions",

  defaultState() {
    return {
      reactionsPickerExpanded: false
    };
  },

  buildKey: attrs => `discourse-reactions-actions-${attrs.post.id}`,

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
        reaction =>
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
      !post.current_user_reaction ||
      (post.current_user_reaction.can_undo && post.likeAction.canToggle)
    ) {
      classes.push("can-toggle-reaction");
    }

    return classes;
  },

  toggleReactions(event) {
    if (!this.state.reactionsPickerExpanded) {
      this.expandReactionsPicker(event);
    }
  },

  touchStart() {
    this._touchTimeout && cancel(this._touchTimeout);

    if (this.capabilities.touch) {
      const root = document.getElementsByTagName("html")[0];
      root && root.classList.add("discourse-reactions-no-select");

      this._touchStartAt = Date.now();
      this._touchTimeout = later(() => {
        this._touchStartAt = null;
        this.toggleReactions();
      }, 400);
      return false;
    }
  },

  touchEnd(event) {
    this._touchTimeout && cancel(this._touchTimeout);

    const root = document.getElementsByTagName("html")[0];
    root && root.classList.remove("discourse-reactions-no-select");

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
              : this.siteSettings.discourse_reactions_reaction_for_like
          });
        }
      }
    }
  },

  toggle(params) {
    if (
      !this.attrs.post.current_user_reaction ||
      (this.attrs.post.current_user_reaction.can_undo &&
        this.attrs.post.likeAction.canToggle)
    ) {
      if (this.capabilities.canVibrate) {
        navigator.vibrate(VIBRATE_DURATION);
      }

      const pickedReaction = document.querySelector(
        `[data-post-id="${params.postId}"] .discourse-reactions-picker .pickable-reaction.${params.reaction} .emoji`
      );

      const scales = [1.0, 1.75];
      return new Promise(resolve => {
        scaleReactionAnimation(pickedReaction, scales[0], scales[1], () => {
          scaleReactionAnimation(pickedReaction, scales[1], scales[0], () => {
            const post = this.attrs.post;
            const postContainer = document.querySelector(
              `[data-post-id="${params.postId}"]`
            );
            const current_user_reaction = post.current_user_reaction;
            const current_user_used_main_reaction =
              post.current_user_used_main_reaction;
            const reactions = Object.assign([], post.reactions);
            const reaction_users_count = post.reaction_users_count;

            if (
              post.current_user_reaction &&
              post.current_user_reaction.id === params.reaction
            ) {
              this.toggleReaction(params);

              later(() => {
                dropReaction(postContainer, params.reaction, () => {
                  return CustomReaction.toggle(params.postId, params.reaction)
                    .then(resolve)
                    .catch(e => {
                      bootbox.alert(this.extractErrors(e));

                      post.current_user_reaction = current_user_reaction;
                      post.current_user_used_main_reaction = current_user_used_main_reaction;
                      post.reactions = reactions;
                      post.reaction_users_count = reaction_users_count;

                      this.scheduleRerender();
                    });
                });
              }, 100);
            } else {
              addReaction(postContainer, params.reaction, () => {
                this.toggleReaction(params);

                CustomReaction.toggle(params.postId, params.reaction)
                  .then(resolve)
                  .catch(e => {
                    bootbox.alert(this.extractErrors(e));

                    post.current_user_reaction = current_user_reaction;
                    post.current_user_used_main_reaction = current_user_used_main_reaction;
                    post.reactions = reactions;
                    post.reaction_users_count = reaction_users_count;
                    this.scheduleRerender();
                  });
              });
            }
          });
        });
      }).finally(() => {
        this.collapsePanels();
        this.scheduleRerender();
      });
    }
  },

  toggleReaction(attrs) {
    this.collapsePanels();

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
          const users = post.reactions[index].users;
          const userIndex = users.indexOf(
            users.findBy("username", this.currentUser.username)
          );
          users.splice(userIndex, 1);

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
          post.reactions[index].users.unshift({
            username: this.currentUser.username,
            name: this.currentUser.name,
            avatar_template: this.currentUser.avatar_template,
            can_undo: true
          });
          isAvailable = true;
          return false;
        }
        return true;
      });

      if (!isAvailable) {
        post.reactions.push({
          id: attrs.reaction,
          type: "emoji",
          count: 1,
          users: [
            {
              username: this.currentUser.username,
              name: this.currentUser.name,
              avatar_template: this.currentUser.avatar_template,
              can_undo: true
            }
          ]
        });
      }

      if (!post.current_user_reaction) {
        post.reaction_users_count += 1;
      }

      post.current_user_reaction = {
        id: attrs.reaction,
        type: "emoji",
        can_undo: true
      };
    } else {
      post.reaction_users_count -= 1;
      post.current_user_reaction = null;
    }

    if (
      post.current_user_reaction &&
      post.current_user_reaction.id ===
        this.siteSettings.discourse_reactions_like_icon
    ) {
      post.current_user_used_main_reaction = true;
    } else {
      post.current_user_used_main_reaction = false;
    }
  },

  toggleFromButton(attrs) {
    this.collapsePanels();

    let selector;
    const mainReactionName = this.siteSettings
      .discourse_reactions_reaction_for_like;
    const post = this.attrs.post;
    const current_user_reaction = post.current_user_reaction;
    const current_user_used_main_reaction =
      post.current_user_used_main_reaction;
    const reactions = Object.assign([], post.reactions);
    const reaction_users_count = post.reaction_users_count;

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

    if (this.capabilities.canVibrate) {
      navigator.vibrate(VIBRATE_DURATION);
    }

    if (current_user_reaction && current_user_reaction.id === attrs.reaction) {
      this.toggleReaction(attrs);
      return CustomReaction.toggle(this.attrs.post.id, attrs.reaction).catch(
        e => {
          bootbox.alert(this.extractErrors(e));

          post.current_user_reaction = current_user_reaction;
          post.current_user_used_main_reaction = current_user_used_main_reaction;
          post.reactions = reactions;
          post.reaction_users_count = reaction_users_count;
          this.scheduleRerender();
        }
      );
    }

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
    return new Promise(resolve => {
      scaleReactionAnimation(mainReaction, scales[0], scales[1], () => {
        scaleReactionAnimation(mainReaction, scales[1], scales[0], () => {
          this.toggleReaction(attrs);

          let toggleReaction =
            attrs.reaction && attrs.reaction !== mainReactionName
              ? attrs.reaction
              : this.siteSettings.discourse_reactions_reaction_for_like;

          CustomReaction.toggle(this.attrs.post.id, toggleReaction)
            .then(resolve)
            .catch(e => {
              bootbox.alert(this.extractErrors(e));

              post.current_user_reaction = current_user_reaction;
              post.current_user_used_main_reaction = current_user_used_main_reaction;
              post.reactions = reactions;
              post.reaction_users_count = reaction_users_count;
              this.scheduleRerender();
            });
        });
      });
    });
  },

  extractErrors(e) {
    const xhr = e.xhr || e.jqXHR;

    if (!xhr || !xhr.status) {
      return I18n.t("errors.desc.network");
    }

    if (
      xhr.status === 429 &&
      xhr.responseJSON &&
      xhr.responseJSON.extras &&
      xhr.responseJSON.extras.wait_seconds
    ) {
      return I18n.t("discourse_reactions.reaction.too_many_request", {
        time_left: xhr.responseJSON.extras.wait_seconds
      });
    } else if (xhr.status === 403) {
      return I18n.t("discourse_reactions.reaction.forbidden");
    } else {
      return I18n.t("errors.desc.unknown");
    }
  },

  cancelCollapse() {
    this._collapseHandler && cancel(this._collapseHandler);
  },

  scheduleCollapse() {
    this._collapseHandler && cancel(this._collapseHandler);
    this._collapseHandler = later(this, this.collapsePanels, 500);
  },

  buildId: attrs => `discourse-reactions-actions-${attrs.post.id}`,

  clickOutside() {
    if (this.state.reactionsPickerExpanded || this.state.statePanelExpanded) {
      this.collapsePanels();
    }
  },

  expandReactionsPicker() {
    this.state.statePanelExpanded = false;
    this.state.reactionsPickerExpanded = true;
    this.scheduleRerender();

    this._setupPopper(this.attrs.post.id, "_popperPicker", [
      ".discourse-reactions-reaction-button",
      ".discourse-reactions-picker"
    ]);
  },

  collapseStatePanel() {
    this.state.statePanelExpanded = false;
    this._resetPopper();
    this.scheduleRerender();
  },

  collapsePanels() {
    this.cancelCollapse();

    this.state.statePanelExpanded = false;
    this.state.reactionsPickerExpanded = false;
    this._resetPopper();
    this.scheduleRerender();
  },

  _resetPopper() {
    const container = document.getElementById(this.buildId(this.attrs));
    container &&
      container
        .querySelectorAll(
          ".discourse-reactions-state-panel.is-expanded, .discourse-reactions-reactions-picker.is-expanded"
        )
        .forEach(popper => popper.classList.remove("is-expanded"));
  },

  html(attrs) {
    const post = attrs.post;
    const items = [];
    const mainReaction = this.siteSettings
      .discourse_reactions_reaction_for_like;

    if (this.currentUser && post.user_id !== this.currentUser.id) {
      items.push(
        this.attach(
          "discourse-reactions-picker",
          Object.assign({}, attrs, {
            reactionsPickerExpanded: this.state.reactionsPickerExpanded
          })
        )
      );
    }

    if (
      post.reactions &&
      post.reactions.length === 1 &&
      post.reactions[0].id === mainReaction
    ) {
      items.push(this.attach("discourse-reactions-double-button", attrs));
    } else if (post.site.mobileView) {
      if (!post.yours) {
        items.push(this.attach("discourse-reactions-counter", attrs));
        items.push(this.attach("discourse-reactions-reaction-button", attrs));
      } else if (post.yours && post.reactions && post.reactions.length) {
        items.push(this.attach("discourse-reactions-counter", attrs));
      }
    } else {
      if (!post.yours) {
        items.push(this.attach("discourse-reactions-reaction-button", attrs));
      }
    }

    return items;
  },

  _setupPopper(postId, popper, selectors) {
    next(() => {
      const trigger = document.querySelector(
        `#discourse-reactions-actions-${postId} ${selectors[0]}`
      );
      const popperElement = document.querySelector(
        `#discourse-reactions-actions-${postId} ${selectors[1]}`
      );

      if (popperElement) {
        popperElement.classList.add("is-expanded");

        if (this[popper]) {
          return;
        }

        this[popper] = this._applyPopper(trigger, popperElement);
      }
    });
  },

  _applyPopper(button, picker) {
    // eslint-disable-next-line
    Popper.createPopper(button, picker, {
      placement: "top",
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, -5]
          }
        },
        {
          name: "preventOverflow",
          options: {
            padding: 5
          }
        }
      ]
    });
  }
});
