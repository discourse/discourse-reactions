import { iconHTML } from "discourse-common/lib/icon-library";
import { emojiUrlFor } from "discourse/lib/text";
import { Promise } from "rsvp";
import { next, run } from "@ember/runloop";
import { createWidget } from "discourse/widgets/widget";
import CustomReaction from "../models/discourse-reactions-custom-reaction";
import { isTesting } from "discourse-common/config/environment";
import { later, cancel } from "@ember/runloop";
import I18n from "I18n";
import bootbox from "bootbox";

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
          $(this).css("transform", `scale(${now})`);
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
      reactionsPickerExpanded: false,
      statePanelExpanded: false
    };
  },

  buildKey: attrs => `discourse-reactions-actions-${attrs.post.id}`,

  buildClasses(attrs) {
    if (!attrs.post.reactions) {
      return;
    }

    const post = attrs.post;
    const mainReaction = this.siteSettings
      .discourse_reactions_reaction_for_like;
    const hasReactions = post.reactions.length;
    const hasReacted = post.current_user_reaction;
    const classes = [];

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
      classes.push("can-toggle-main-reaction");
    }

    return classes;
  },

  toggleReactions(event) {
    if (!this.state.reactionsPickerExpanded) {
      this.expandReactionsPicker(event);
    }
  },

  toggleStatePanel(event) {
    if (!this.state.statePanelExpanded) {
      this.expandStatePanel(event);
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
          this.toggleReactionFromButton({
            reaction: this.attrs.post.current_user_reaction
              ? this.attrs.post.current_user_reaction.id
              : null
          });
        }
      }
    }
  },

  toggleReaction(params) {
    if (
      !this.attrs.post.current_user_reaction ||
      (this.attrs.post.current_user_reaction.can_undo &&
        this.attrs.post.likeAction.canToggle)
    ) {
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
              this.dropReactionAnimation && cancel(this.dropReactionAnimation);
              this.collapsePanels();
              this.dropUserReaction();

              post.reaction_users_count -= 1;
              post.current_user_used_main_reaction = false;
              this.setCurrentUserReaction(null);
              let dropReactionAnimation = later(() => {
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
                this.collapsePanels();
                this.dropUserReaction();
                this.addUserReaction(params.reaction);

                if (!post.current_user_reaction) {
                  post.reaction_users_count += 1;
                }

                this.setCurrentUserReaction(params.reaction);

                if (
                  post.current_user_reaction &&
                  post.current_user_reaction.id ===
                    this.siteSettings.discourse_reactions_like_icon
                ) {
                  post.current_user_used_main_reaction = true;
                } else {
                  post.current_user_used_main_reaction = false;
                }

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

  toggleReactionFromButton(attrs) {
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

    if (
      post.reactions &&
      post.reactions.length === 1 &&
      post.reactions[0].id === mainReactionName
    ) {
      selector = `[data-post-id="${this.attrs.post.id}"] .double-button .discourse-reactions-reaction-button .d-icon`;
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
        const mainReactionIcon = this.siteSettings
          .discourse_reactions_like_icon;
        const hasUsedMainReaction = post.current_user_used_main_reaction;
        const template = document.createElement("template");

        const replaceIcon =
          hasUsedMainReaction ||
          (attrs.reaction && attrs.reaction !== mainReactionName)
            ? `far-${mainReactionIcon}`
            : mainReactionIcon;

        template.innerHTML = iconHTML(replaceIcon).trim();
        const icon = template.content.firstChild;
        icon.style.transform = `scale(${scales[1]})`;

        mainReaction.parentNode.replaceChild(icon, mainReaction);
        scaleReactionAnimation(icon, scales[1], scales[0], () => {
          this.dropUserReaction();
          if (attrs.reaction && attrs.reaction !== mainReactionName) {
            this.addUserReaction(attrs.reaction);
          } else {
            this.addUserReaction(
              this.siteSettings.discourse_reactions_like_icon
            );
          }

          if (post.current_user_reaction) {
            post.reaction_users_count -= 1;
            this.setCurrentUserReaction(null);
            post.current_user_used_main_reaction = false;
          } else {
            post.reaction_users_count += 1;
            this.setCurrentUserReaction(
              this.siteSettings.discourse_reactions_like_icon
            );
            post.current_user_used_main_reaction = true;
          }

          let toggleReaction =
            attrs.reaction && attrs.reaction !== mainReactionName
              ? attrs.reaction
              : this.siteSettings.discourse_reactions_reaction_for_like;

          CustomReaction.toggle(this.attrs.post.id, toggleReaction)
            .then(resolve)
            .catch(e => {
              bootbox.alert(this.extractErrors(e));

              const template = document.createElement("template");

              template.innerHTML = iconHTML(replaceIcon).trim();

              const mainReaction = template.content.firstChild;

              icon.replaceWith(mainReaction);

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
    const xhr = e.xhr;

    if (!e.jqXHR || !e.jqXHR.status) {
      return I18n.t("errors.desc.network");
    }

    if (
      e.jqXHR &&
      e.jqXHR.status === 429 &&
      xhr.responseJSON &&
      xhr.responseJSON.extras &&
      xhr.responseJSON.extras.wait_seconds
    ) {
      return I18n.t("discourse_reactions.reaction.too_many_request");
    } else if (e.jqXHR.status === 403) {
      return I18n.t("discourse_reactions.reaction.forbidden");
    } else {
      return I18n.t("errors.desc.unknown");
    }
  },

  setCurrentUserReaction(reactionId) {
    const post = this.attrs.post;

    if (reactionId) {
      post.current_user_reaction = {
        id: reactionId,
        type: "emoji",
        can_undo: true
      };
    } else {
      post.current_user_reaction = null;
    }
    this.scheduleRerender();
  },

  dropUserReaction() {
    if (!this.attrs.post.current_user_reaction) {
      return;
    }

    const post = this.attrs.post;

    post.reactions.every((reaction, index) => {
      if (
        reaction.count <= 1 &&
        reaction.id === post.current_user_reaction.id
      ) {
        post.reactions.splice(index, 1);
        return false;
      } else if (reaction.id === post.current_user_reaction) {
        post.reactions[index].count -= 1;
        return false;
      }

      return true;
    });

    this.scheduleRerender();
  },

  addUserReaction(reactionId) {
    const post = this.attrs.post;
    let isAvailable = false;

    post.reactions.every((reaction, index) => {
      if (reaction.id === reactionId) {
        post.reactions[index].count += 1;
        post.reactions[index].users.push({
          username: this.currentUser.username,
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
        id: reactionId,
        type: "emoji",
        count: 1,
        users: [
          {
            username: this.currentUser.username,
            avatar_template: this.currentUser.avatar_template,
            can_undo: true
          }
        ]
      });
    }
    this.scheduleRerender();
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

  expandStatePanel() {
    this.state.reactionsPickerExpanded = false;
    this.state.statePanelExpanded = true;
    this.scheduleRerender();
    this._setupPopper(this.attrs.post.id, "_popperStatePanel", [
      ".discourse-reactions-counter",
      ".discourse-reactions-state-panel"
    ]);
  },

  collapsePanels() {
    this.cancelCollapse();

    this.state.statePanelExpanded = false;
    this.state.reactionsPickerExpanded = false;

    const container = document.getElementById(this.buildId(this.attrs));
    container &&
      container
        .querySelectorAll(
          ".discourse-reactions-state-panel.is-expanded, .discourse-reactions-reactions-picker.is-expanded"
        )
        .forEach(popper => popper.classList.remove("is-expanded"));

    this.scheduleRerender();
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
      } else if (post.yours && attrs.reactions && post.reactions.length) {
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
