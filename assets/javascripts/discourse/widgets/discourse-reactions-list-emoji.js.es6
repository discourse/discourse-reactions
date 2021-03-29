import { createPopper } from "@popperjs/core";
import { h } from "virtual-dom";
import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { createWidget } from "discourse/widgets/widget";
import { schedule } from "@ember/runloop";
import I18n from "I18n";

const DISPLAY_MAX_USERS = 19;
let _popperReactionUserPanel;

export default createWidget("discourse-reactions-list-emoji", {
  tagName: "div.reaction",

  buildId: attrs =>
    `discourse-reactions-list-emoji-${attrs.post.id}-${attrs.reaction.id}`,

  mouseOver() {
    if (!window.matchMedia("(hover: none)").matches) {
      this._setupPopper(".user-list");

      if (!this.attrs.users.length) {
        this.callWidgetFunction("getUsers", this.attrs.reaction.id);
      }
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
        html: emojiUnescape(`:${reaction.id}:`, {
          skipTitle: true,
          class: this.siteSettings
            .discourse_reactions_desaturated_reaction_panel
            ? "desaturated"
            : ""
        })
      })
    ];

    if (!window.matchMedia("(hover: none)").matches) {
      elements.push(h(`div.user-list`, h("div.container", displayUsers)));
    }

    return elements;
  },

  _setupPopper(selector) {
    schedule("afterRender", () => {
      let popperElement;
      const elementId = CSS.escape(this.buildId(this.attrs));
      const trigger = document.querySelector(`#${elementId}`);
      popperElement = document.querySelector(`#${elementId} ${selector}`);

      if (popperElement) {
        _popperReactionUserPanel && _popperReactionUserPanel.destroy();
        _popperReactionUserPanel = this._applyPopper(trigger, popperElement);
      }
    });
  },

  _applyPopper(button, picker) {
    return createPopper(button, picker, {
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
