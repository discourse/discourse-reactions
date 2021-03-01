import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";
import I18n from "I18n";
import { next } from "@ember/runloop";
import { later, cancel } from "@ember/runloop";

let _laterHoverHandlers = {};

export default createWidget("discourse-reactions-counter", {
  tagName: "div",

  buildKey: attrs => `discourse-reactions-counter-${attrs.post.id}`,

  buildId: attrs => `discourse-reactions-counter-${attrs.post.id}`,

  defaultState() {
    return {
      statePanelExpanded: false
    };
  },

  click(event) {
    this._cancelHoverHandler();

    if (!this.capabilities.touch) {
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

  mouseOut() {
    this._cancelHoverHandler();

    if (!window.matchMedia("(hover: none)").matches) {
      this.scheduleCollapse();
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
            statePanelExpanded: this.state.statePanelExpanded
          })
        )
      );

      if (
        !(
          attrs.post.reactions.length === 1 &&
          attrs.post.reactions[0].id === mainReaction
        )
      ) {
        items.push(this.attach("discourse-reactions-list", attrs));
      }

      items.push(h("span.reactions-counter", count.toString()));

      return items;
    }
  },

  _cancelHoverHandler() {
    const handler = _laterHoverHandlers[this.attrs.post.id];
    handler && cancel(handler);
  },

  _hoverHandler(event) {
    this.cancelCollapse();
    this.toggleStatePanel(event);
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
