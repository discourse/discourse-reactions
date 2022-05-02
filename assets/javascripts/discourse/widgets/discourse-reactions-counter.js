import { createPopper } from "@popperjs/core";
import { h } from "virtual-dom";
import { iconNode } from "discourse-common/lib/icon-library";
import { createWidget } from "discourse/widgets/widget";
import { cancel, later, schedule } from "@ember/runloop";
import CustomReaction from "../models/discourse-reactions-custom-reaction";

let _popperStatePanel;

export default createWidget("discourse-reactions-counter", {
  tagName: "div",

  buildKey: (attrs) => `discourse-reactions-counter-${attrs.post.id}`,

  buildId: (attrs) => `discourse-reactions-counter-${attrs.post.id}`,

  reactionsChanged(data) {
    data.reactions.uniq().forEach((reaction) => {
      this.getUsers(reaction);
    });
  },

  defaultState(attrs) {
    const state = {};
    state.reactionsUsers = {};
    state.statePanelExpanded = false;
    return state;
  },

  getUsers(reactionValue) {
    return CustomReaction.findReactionUsers(this.attrs.post.id, {
      reactionValue,
    }).then((response) => {
      response.reaction_users.forEach((reactionUser) => {
        this.state.reactionsUsers[reactionUser.id] = reactionUser.users;
      });

      _popperStatePanel?.update();
      this.scheduleRerender();
    });
  },

  click(event) {
    if (!this.capabilities.touch || !this.site.mobileView) {
      event.stopPropagation();

      // in case we lost sync due to another widget not in the same tree
      // collapsing the panel, we attempt to reconciliate from DOM state
      const container = document.getElementById(this.buildId(this.attrs));
      if (
        !container
          .querySelector(".discourse-reactions-state-panel")
          .classList.contains("is-expanded")
      ) {
        this.state.statePanelExpanded = false;
      }

      if (!this.state.statePanelExpanded) {
        this.getUsers();
      }
      this.toggleStatePanel(event);
    }
  },

  clickOutside() {
    if (this.state.statePanelExpanded) {
      this.collapsePanels();
    }
  },

  touchStart(event) {
    if (this.state.statePanelExpanded) {
      return;
    }

    if (this.capabilities.touch) {
      event.stopPropagation();
      this.getUsers();
      this.toggleStatePanel(event);
    }
  },

  buildClasses(attrs) {
    const classes = [];
    const mainReaction = this.siteSettings
      .discourse_reactions_reaction_for_like;

    if (
      attrs.post.reactions &&
      attrs.post.reactions.length === 1 &&
      attrs.post.reactions[0].id === mainReaction
    ) {
      classes.push("only-like");
    }

    if (attrs.post.reaction_users_count > 0) {
      classes.push("discourse-reactions-counter");
    }

    return classes;
  },

  html(attrs) {
    if (attrs.post.reaction_users_count) {
      const post = attrs.post;
      const count = post.reaction_users_count;
      if (count <= 0) {
        return;
      }

      const mainReaction = this.siteSettings
        .discourse_reactions_reaction_for_like;
      const mainReactionIcon = this.siteSettings.discourse_reactions_like_icon;
      const items = [];

      items.push(
        this.attach(
          "discourse-reactions-state-panel",
          Object.assign({}, attrs, {
            statePanelExpanded: this.state.statePanelExpanded,
            reactionsUsers: this.state.reactionsUsers,
          })
        )
      );

      if (
        !(post.reactions.length === 1 && post.reactions[0].id === mainReaction)
      ) {
        items.push(
          this.attach("discourse-reactions-list", {
            reactionsUsers: this.state.reactionsUsers,
            post: attrs.post,
          })
        );
      }

      items.push(h("span.reactions-counter", count.toString()));

      if (
        post.yours &&
        post.reactions &&
        post.reactions.length === 1 &&
        post.reactions[0].id === mainReaction
      ) {
        items.push(
          h(
            "div.discourse-reactions-reaction-button.my-likes",
            h(
              "button.btn-toggle-reaction-like.btn-icon.no-text.reaction-button",
              [iconNode(`${mainReactionIcon}`)]
            )
          )
        );
      }

      return items;
    }
  },

  collapsePanels() {
    this.cancelCollapse();
    this.state.statePanelExpanded = false;
    this.state.reactionsPickerExpanded = false;
    this._resetPopper();
    this.scheduleRerender();
  },

  scheduleCollapse() {
    this._collapseHandler && cancel(this._collapseHandler);
    this._collapseHandler = later(this, this.collapsePanels, 500);
  },

  cancelCollapse() {
    this._collapseHandler && cancel(this._collapseHandler);
  },

  toggleStatePanel(event) {
    if (!this.state.statePanelExpanded) {
      this.expandStatePanel(event);
    } else {
      this.scheduleCollapse();
    }
  },

  expandStatePanel() {
    this.state.reactionsPickerExpanded = false;
    this.state.statePanelExpanded = true;
    this.scheduleRerender();
    this._setupPopper(this.attrs.post.id, ".discourse-reactions-state-panel");
  },

  _setupPopper(postId, selector) {
    schedule("afterRender", () => {
      let popperElement;
      const trigger = document.querySelector(
        `#discourse-reactions-counter-${postId}`
      );

      if (this.site.mobileView) {
        popperElement = document.querySelector(
          `[data-post-id="${postId}"] ${selector}`
        );
      } else {
        popperElement = document.querySelector(
          `#discourse-reactions-counter-${postId} ${selector}`
        );
      }

      if (popperElement) {
        popperElement.classList.add("is-expanded");

        _popperStatePanel && _popperStatePanel.destroy();
        _popperStatePanel = createPopper(trigger, popperElement, {
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
      }
    });
  },

  _resetPopper() {
    const container = document.getElementById(this.buildId(this.attrs));
    container &&
      container
        .querySelectorAll(
          ".discourse-reactions-state-panel.is-expanded, .discourse-reactions-reactions-picker.is-expanded, .user-list.is-expanded"
        )
        .forEach((popper) => popper.classList.remove("is-expanded"));
  },
});
