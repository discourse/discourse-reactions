import { h } from "virtual-dom";
import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { createWidget } from "discourse/widgets/widget";
import { later, cancel } from "@ember/runloop";
import { next } from "@ember/runloop";

const DISPLAY_MAX_USERS = 19;
let _laterHoverHandlers = {};

export default createWidget("discourse-reactions-list-emoji", {
  tagName: "div",
  buildId: attrs =>
    `discourse-reactions-list-emoji-${attrs.post.id}-${attrs.reaction.id}`,
  buildKey: attrs =>
    `discourse-reactions-list-emoji-${attrs.post.id}-${attrs.reaction.id}`,

  defaultState() {
    return {
      reactionUserPanelExpanded: false
    };
  },

  mouseOver(event) {
    this._cancelHoverHandler();

    if (!window.matchMedia("(hover: none)").matches) {
      _laterHoverHandlers[this.attrs.post.id] = later(
        this,
        this._hoverHandler,
        event,
        500
      );
    }
  },

  _hoverHandler(event) {
    this.cancelCollapse();
    this.toggleReactionUserPanel(event);
  },

  mouseOut(event) {
    this._cancelHoverHandler();

    if (!window.matchMedia("(hover: none)").matches) {
      this.scheduleCollapse();
    }
  },

  _cancelHoverHandler() {
    const handler = _laterHoverHandlers[this.attrs.post.id];
    handler && cancel(handler);
  },

  scheduleCollapse() {
    this._collapseHandler && cancel(this._collapseHandler);
    this._collapseHandler = later(this, this.collapsePanels, 500);
  },

  cancelCollapse() {
    this._collapseHandler && cancel(this._collapseHandler);
  },

  collapsePanels() {
    this.cancelCollapse();
    this.state.reactionUserPanelExpanded = false;

    const container = document.getElementById(this.buildId(this.attrs));

    container &&
      container
        .querySelectorAll(
          ".discourse-reactions-state-panel.is-expanded, .discourse-reactions-reactions-picker.is-expanded, .user-list.is-expanded"
        )
        .forEach(popper => popper.classList.remove("is-expanded"));

    this.scheduleRerender();
  },

  toggleReactionUserPanel(event) {
    if (!this.state.reactionUserPanelExpanded) {
      this.expandReactionUserPanel(event);
    } else {
      this.scheduleCollapse();
    }
  },

  expandReactionUserPanel() {
    this.state.reactionsPickerExpanded = false;
    this.state.statePanelExpanded = false;
    this.state.reactionUserPanelExpanded = true;
    this.scheduleRerender();
    this._setupPopper(
      this.attrs.post.id,
      this.attrs.reaction.id,
      "_popperReactionUserPanel",
      `.user-list-${this.attrs.reaction.id}`
    );
  },

  buildClasses(attrs) {
    const classes = [];
    classes.push(`discourse-reactions-list-emoji-${attrs.reaction.id}`);

    classes.push("reaction");

    classes.push(attrs.reaction.id.toString());

    return classes;
  },

  _setupPopper(postId, reactionId, popper, selector) {
    next(() => {
      let popperElement;
      const trigger = document.querySelector(
        `#discourse-reactions-list-emoji-${postId}-${reactionId}`
      );

      popperElement = document.querySelector(
        `#discourse-reactions-list-emoji-${postId}-${reactionId} ${selector}`
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
      placement: "bottom",
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
  },

  html(attrs) {
    if (attrs.reaction.count <= 0) {
      return;
    }

    const reaction = attrs.reaction;
    const users = attrs.reaction.users;
    const displayUsers = [];
    let i = 0;

    displayUsers.push(h("p.heading", attrs.reaction.id));

    while (i <= DISPLAY_MAX_USERS && i < users.length) {
      displayUsers.push(h("p.username", users[i].username));
      i++;
    }

    if (attrs.reaction.count > DISPLAY_MAX_USERS) {
      displayUsers.push(
        h(
          "p.other_users",
          I18n.t("discourse_reactions.state_panel.more_users", {
            count: attrs.reaction.count - DISPLAY_MAX_USERS
          })
        )
      );
    }

    return [
      h(`div.reaction.${attrs.reaction.id}`, [
        new RawHtml({
          html: emojiUnescape(`:${reaction.id}:`, { skipTitle: true })
        }),
        h(
          `div.user-list.user-list-${reaction.id}`,
          h("div.container", displayUsers)
        )
      ])
    ];
  }
});
