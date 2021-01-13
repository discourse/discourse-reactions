import { iconHTML } from "discourse-common/lib/icon-library";
import { emojiUrlFor } from "discourse/lib/text";
import { Promise } from "rsvp";
import { h } from "virtual-dom";
import { next, run } from "@ember/runloop";
import { createWidget } from "discourse/widgets/widget";
import CustomReaction from "../models/discourse-reactions-custom-reaction";
import { isTesting } from "discourse-common/config/environment";
import { later, cancel } from "@ember/runloop";

function buildFakeReaction(reactionId) {
  const img = document.createElement("img");
  img.src = emojiUrlFor(reactionId);
  img.classList.add("emoji");

  const div = document.createElement("div");
  div.classList.add("fake-reaction", "reaction", reactionId);
  div.appendChild(img);

  return div;
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

  let done;

  const fakeReaction = buildFakeReaction(reactionId);
  fakeReaction.style.top = startPosition;
  fakeReaction.style.opacity = 0;

  const list = postContainer.querySelector(
    ".discourse-reactions-list .reactions"
  );

  if (list) {
    list.appendChild(fakeReaction);

    done = () => {
      fakeReaction.remove();
      complete();
    };
  } else {
    const counter = postContainer.querySelector(".discourse-reactions-counter");

    const reactionsList = document.createElement("div");
    reactionsList.classList.add("discourse-reactions-list");

    const reactions = document.createElement("div");
    reactions.classList.add("reactions");

    reactions.appendChild(fakeReaction);
    reactionsList.appendChild(reactions);
    counter.appendChild(reactionsList);

    done = () => {
      reactionsList.remove();
      complete();
    };
  }

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
  moveReactionAnimation(list, reactionId, "-50px", "-8px", complete);
}

function dropReaction(list, reactionId, complete) {
  moveReactionAnimation(list, reactionId, 0, "50px", complete);
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

    const hasReactions = attrs.post.reactions.length;
    const hasReacted = attrs.post.current_user_reaction;
    const classes = [];

    if (hasReactions) {
      classes.push("has-reactions");
    }

    if (hasReacted) {
      classes.push("has-reacted");
    }

    if (attrs.post.current_user_used_main_reaction) {
      classes.push("has-used-main-reaction");
    }

    if (
      attrs.post.likeAction &&
      (attrs.post.likeAction.canToggle || attrs.post.likeAction.can_undo)
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
          event.target.classList.contains("discourse-reactions-reaction-button")
        ) {
          this.toggleLike();
        }
      }
    }
  },

  toggleReaction(params) {
    if (params.canUndo) {
      const pickedReaction = document.querySelector(
        `[data-post-id="${params.postId}"] .discourse-reactions-picker .pickable-reaction.${params.reaction} .emoji`
      );

      const scales = [1.0, 1.75];
      return new Promise(resolve => {
        scaleReactionAnimation(pickedReaction, scales[0], scales[1], () => {
          scaleReactionAnimation(pickedReaction, scales[1], scales[0], () => {
            const postContainer = document.querySelector(
              `[data-post-id="${params.postId}"]`
            );
            const current_user_reaction = this.attrs.post.current_user_reaction;
            const current_user_used_main_reaction = this.attrs.post
              .current_user_used_main_reaction;
            const reactions = Object.assign([], this.attrs.post.reactions);
            const reaction_users_count = this.attrs.post.reaction_users_count;

            if (
              this.attrs.post.current_user_reaction &&
              this.attrs.post.current_user_reaction.id == params.reaction
            ) {
              this.collapsePanels();
              this.dropUserReaction();
              this.attrs.post.reaction_users_count -= 1;
              this.attrs.post.current_user_used_main_reaction = false;
              this.setCurrentUserReaction();
              later(() => {
                dropReaction(postContainer, params.reaction, () => {
                  return CustomReaction.toggle(
                    params.postId,
                    params.reaction
                  ).then(value => {
                    resolve();
                    if (value === undefined) {
                      this.attrs.post.current_user_reaction = current_user_reaction;
                      this.attrs.post.current_user_used_main_reaction = current_user_used_main_reaction;
                      this.attrs.post.reactions = reactions;
                      this.attrs.post.reaction_users_count = reaction_users_count;
                      this.scheduleRerender();
                    }
                  });
                });
              }, 100);
            } else {
              this.dropUserReaction();
              this.addUserReaction(params.reaction);

              if (!this.attrs.post.current_user_reaction) {
                this.attrs.post.reaction_users_count += 1;
              }
              this.setCurrentUserReaction(params.reaction);

              if (
                this.attrs.post.current_user_reaction &&
                this.attrs.post.current_user_reaction.id ==
                  this.siteSettings.discourse_reactions_like_icon
              ) {
                this.attrs.post.current_user_used_main_reaction = true;
              } else {
                this.attrs.post.current_user_used_main_reaction = false;
              }

              addReaction(postContainer, params.reaction, () => {
                this.collapsePanels();
                CustomReaction.toggle(params.postId, params.reaction).then(
                  value => {
                    resolve();
                    if (value === undefined) {
                      this.attrs.post.current_user_reaction = current_user_reaction;
                      this.attrs.post.current_user_used_main_reaction = current_user_used_main_reaction;
                      this.attrs.post.reactions = reactions;
                      this.attrs.post.reaction_users_count = reaction_users_count;
                      this.scheduleRerender();
                    }
                  }
                );
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

  toggleLike() {
    this.collapsePanels();
    const current_user_reaction = this.attrs.post.current_user_reaction;
    const current_user_used_main_reaction = this.attrs.post
      .current_user_used_main_reaction;
    const reactions = Object.assign([], this.attrs.post.reactions);
    const reaction_users_count = this.attrs.post.reaction_users_count;

    if (
      this.attrs.post.likeAction &&
      !(
        this.attrs.post.likeAction.canToggle ||
        this.attrs.post.likeAction.can_undo
      )
    ) {
      return;
    }

    if (!this.currentUser || this.attrs.post.user_id === this.currentUser.id) {
      return;
    }

    const mainReaction = document.querySelector(
      `[data-post-id="${this.attrs.post.id}"] .discourse-reactions-reaction-button .d-icon`
    );
    const scales = [1.0, 1.5];
    return new Promise(resolve => {
      scaleReactionAnimation(mainReaction, scales[0], scales[1], () => {
        const mainReactionIcon = this.siteSettings
          .discourse_reactions_like_icon;
        const hasUsedMainReaction = this.attrs.post
          .current_user_used_main_reaction;
        const template = document.createElement("template");
        template.innerHTML = iconHTML(
          hasUsedMainReaction ? `far-${mainReactionIcon}` : mainReactionIcon
        ).trim();
        const icon = template.content.firstChild;
        icon.style.transform = `scale(${scales[1]})`;

        mainReaction.parentNode.replaceChild(icon, mainReaction);
        scaleReactionAnimation(icon, scales[1], scales[0], () => {
          this.dropUserReaction();
          this.addUserReaction(this.siteSettings.discourse_reactions_like_icon);

          if (!this.attrs.post.current_user_reaction) {
            this.attrs.post.reaction_users_count += 1;
            this.setCurrentUserReaction(
              this.siteSettings.discourse_reactions_like_icon
            );
            this.attrs.post.current_user_used_main_reaction = true;
          } else {
            this.attrs.post.reaction_users_count -= 1;
            this.setCurrentUserReaction();
            this.attrs.post.current_user_used_main_reaction = false;
          }

          CustomReaction.toggle(
            this.attrs.post.id,
            this.siteSettings.discourse_reactions_reaction_for_like
          ).then(value => {
            resolve();
            if (value === undefined) {
              const mainReactionIcon = this.siteSettings
                .discourse_reactions_like_icon;
              const hasUsedMainReaction = this.attrs.post
                .current_user_used_main_reaction;
              const template = document.createElement("template");
              template.innerHTML = iconHTML(
                hasUsedMainReaction
                  ? `far-${mainReactionIcon}`
                  : mainReactionIcon
              ).trim();
              const mainReaction = template.content.firstChild;
              icon.parentNode.replaceChild(mainReaction, icon);

              this.attrs.post.current_user_reaction = current_user_reaction;
              this.attrs.post.current_user_used_main_reaction = current_user_used_main_reaction;
              this.attrs.post.reactions = reactions;
              this.attrs.post.reaction_users_count = reaction_users_count;
              this.scheduleRerender();
            }
          });
        });
      });
    });
  },

  setCurrentUserReaction(reactionId = null) {
    if (reactionId) {
      this.attrs.post.current_user_reaction = {
        id: reactionId,
        type: "emoji",
        can_undo: true
      };
    } else {
      this.attrs.post.current_user_reaction = null;
    }
    this.scheduleRerender();
  },

  dropUserReaction() {
    if (this.attrs.post.current_user_reaction) {
      this.attrs.post.reactions.every((reaction, index) => {
        if (
          reaction.count <= 1 &&
          reaction.id == this.attrs.post.current_user_reaction.id
        ) {
          this.attrs.post.reactions.splice(index, 1);
          return false;
        } else if (reaction.id == this.attrs.post.current_user_reaction) {
          this.attrs.post.reactions[index].count -= 1;
          return false;
        }

        return true;
      });
    }
    this.scheduleRerender();
  },

  addUserReaction(reactionId) {
    let isAvailable = false;
    this.attrs.post.reactions.every((reaction, index) => {
      if (reaction.id == reactionId) {
        this.attrs.post.reactions[index].count += 1;
        this.attrs.post.reactions[index].users.push({
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
      this.attrs.post.reactions.push({
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

    const currentUserReaction = this.attrs.post.current_user_reaction;
    const mainReactionIcon = this.siteSettings.discourse_reactions_like_icon;

    this._setupPopper(this.attrs.post.id, "_popperPicker", [
      currentUserReaction && currentUserReaction.id != mainReactionIcon
        ? ".btn-toggle-reaction-emoji"
        : ".btn-toggle-reaction-like",
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
    const items = [];

    items.push(
      this.attach(
        "discourse-reactions-state-panel",
        Object.assign({}, attrs, {
          statePanelExpanded: this.state.statePanelExpanded
        })
      )
    );

    if (this.currentUser && attrs.post.user_id !== this.currentUser.id) {
      items.push(
        this.attach(
          "discourse-reactions-picker",
          Object.assign({}, attrs, {
            reactionsPickerExpanded: this.state.reactionsPickerExpanded
          })
        )
      );
    }

    items.push(this.attach("discourse-reactions-counter", attrs));

    if (this.currentUser && attrs.post.user_id !== this.currentUser.id) {
      items.push(this.attach("discourse-reactions-reaction-button", attrs));
    }

    return items;
  },

  _setupPopper(postId, popperVariable, selectors) {
    next(() => {
      const trigger = document.querySelector(
        `#discourse-reactions-actions-${postId} ${selectors[0]}`
      );
      const popper = document.querySelector(
        `#discourse-reactions-actions-${postId} ${selectors[1]}`
      );

      if (popper) {
        popper.classList.add("is-expanded");

        if (this[popperVariable]) {
          return;
        }

        this[popperVariable] = this._applyPopper(trigger, popper);
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
