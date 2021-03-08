import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";
import { next } from "@ember/runloop";
import { later, cancel } from "@ember/runloop";
import CustomReaction from "../models/discourse-reactions-custom-reaction";
import MessageBus from "message-bus-client";

export default createWidget("discourse-reactions-counter", {
  tagName: "div",

  buildKey: attrs => `discourse-reactions-counter-${attrs.post.id}`,

  buildId: attrs => `discourse-reactions-counter-${attrs.post.id}`,

  init() {
    this.subscribe();
  },

  unsubscribe() {
    if (!this.attrs.post.id) {
      return;
    }
    MessageBus.unsubscribe(`/post/${this.attrs.post.id}`);
  },

  subscribe() {
    this.unsubscribe();

    MessageBus.subscribe(`/post/${this.attrs.post.id}`, data => {
      if (this.state[data.type].length) {
        this.getUsers(data.type);
      }
    });
  },

  defaultState() {
    const state = {};

    this.siteSettings.discourse_reactions_enabled_reactions
      .split("|")
      .forEach(item => {
        state[item] = [];
      });

    state[this.siteSettings.discourse_reactions_reaction_for_like] = [];
    state.statePanelExpanded = false;
    state.postId = null;
    state.reactionValue = null;
    state.postIds = [];

    return state;
  },

  getUsers(reactionValue) {
    if (reactionValue && this.state.reactionValue) {
      return;
    }

    if (
      !reactionValue &&
      (this.state.postId || this.state.postIds.includes(this.attrs.post.id))
    ) {
      return;
    }

    if (!reactionValue && !this.state.postIds.includes(this.attrs.post.id)) {
      this.state.postIds.push(this.attrs.post.id);
    }

    this.state.postId = this.attrs.post.id;
    this.state.reactionValue = reactionValue;

    CustomReaction.findReactionUsers(this.attrs.post.id, {
      reactionValue
    }).then(reactions => {
      reactions.reaction_users.forEach(reactionUser => {
        this.state[reactionUser.id] = reactionUser.users;
      });
      this.state.postId = null;
      this.state.reactionValue = null;
      this.scheduleRerender();
    });
  },

  click(event) {
    if (!this.capabilities.touch || !this.site.mobileView) {
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
      const count = attrs.post.reaction_users_count;
      const mainReaction = this.siteSettings
        .discourse_reactions_reaction_for_like;
      const items = [];

      if (count <= 0) {
        return;
      }

      items.push(
        this.attach(
          "discourse-reactions-state-panel",
          Object.assign({}, attrs, {
            statePanelExpanded: this.state.statePanelExpanded,
            state: this.state
          })
        )
      );

      if (
        !(
          attrs.post.reactions.length === 1 &&
          attrs.post.reactions[0].id === mainReaction
        )
      ) {
        attrs.state = this.state;
        items.push(this.attach("discourse-reactions-list", attrs));
      }

      items.push(h("span.reactions-counter", count.toString()));

      return items;
    }
  },

  collapsePanels() {
    this.cancelCollapse();
    this.state.statePanelExpanded = false;
    this.state.reactionsPickerExpanded = false;

    const container = document.getElementById(this.buildId(this.attrs));
    container &&
      container
        .querySelectorAll(
          ".discourse-reactions-state-panel.is-expanded, .discourse-reactions-reactions-picker.is-expanded, .user-list.is-expanded"
        )
        .forEach(popper => popper.classList.remove("is-expanded"));

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
    this._setupPopper(
      this.attrs.post.id,
      "_popperStatePanel",
      ".discourse-reactions-state-panel"
    );
  },

  _setupPopper(postId, popper, selector) {
    next(() => {
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
