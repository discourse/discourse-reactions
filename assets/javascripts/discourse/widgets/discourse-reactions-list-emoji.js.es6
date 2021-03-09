import { createPopper } from "@popperjs/core";
import { h } from "virtual-dom";
import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { createWidget } from "discourse/widgets/widget";
import { next } from "@ember/runloop";
import I18n from "I18n";

const DISPLAY_MAX_USERS = 19;
const POPPER_NAME = "_popperReactionUserPanel";

export default createWidget("discourse-reactions-list-emoji", {
  tagName: "div.reaction",

  buildId: attrs =>
    `discourse-reactions-list-emoji-${attrs.post.id}-${attrs.reaction.id}`,

  mouseOver() {
    if (this.site.mobileView) {
      return;
    }

    if (
      !window.matchMedia("(hover: none)").matches &&
      !this.attrs.users.length
    ) {
      this.callWidgetFunction("getUsers", this.attrs.reaction.id);
    }
  },

  didRenderWidget() {
    if (!window.matchMedia("(hover: none)").matches && !this[POPPER_NAME]) {
      this._setupPopper(POPPER_NAME, ".user-list");
    }
  },

  html(attrs) {
    if (attrs.reaction.count <= 0) {
      return;
    }

    const reaction = attrs.reaction;
    const users = attrs.users || [];
    const displayUsers = [];

    displayUsers.push(h("span.heading", attrs.reaction.id));

    if (!users.length) {
      displayUsers.push(h("div.center", h("div.spinner.small")));
    } else {
      users.slice(0, DISPLAY_MAX_USERS).forEach(user => {
        let displayName;
        if (this.siteSettings.prioritize_username_in_ux) {
          displayName = user.username;
        } else if (!user.name) {
          displayName = user.username;
        } else {
          displayName = user.name;
        }

        displayUsers.push(h("span.username", displayName));
      });

      if (attrs.reaction.count > DISPLAY_MAX_USERS) {
        displayUsers.push(
          h(
            "span.other-users",
            I18n.t("discourse_reactions.state_panel.more_users", {
              count: attrs.reaction.count - DISPLAY_MAX_USERS
            })
          )
        );
      }
    }

    const elements = [
      new RawHtml({
        html: emojiUnescape(`:${reaction.id}:`, { skipTitle: true })
      })
    ];

    if (!window.matchMedia("(hover: none)").matches) {
      elements.push(h(`div.user-list`, h("div.container", displayUsers)));
    }

    return elements;
  },

  _setupPopper(popper, selector) {
    next(() => {
      let popperElement;
      const trigger = document.querySelector(`#${this.buildId(this.attrs)}`);

      popperElement = document.querySelector(
        `#${this.buildId(this.attrs)} ${selector}`
      );

      if (popperElement) {
        if (this[popper]) {
          return;
        }

        this[popper] = this._applyPopper(trigger, popperElement);
      }
    });
  },

  _applyPopper(button, picker) {
    createPopper(button, picker, {
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
  }
});
