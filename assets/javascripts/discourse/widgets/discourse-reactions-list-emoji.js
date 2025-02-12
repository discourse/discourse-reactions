import { debounce, schedule } from "@ember/runloop";
import { createPopper } from "@popperjs/core";
import { h } from "virtual-dom";
import { emojiUnescape } from "discourse/lib/text";
import RawHtml from "discourse/widgets/raw-html";
import { createWidget } from "discourse/widgets/widget";
import { i18n } from "discourse-i18n";

const DISPLAY_MAX_USERS = 19;
let _popperReactionUserPanel;

export default createWidget("discourse-reactions-list-emoji", {
  tagName: "div.discourse-reactions-list-emoji",

  buildId: (attrs) =>
    `discourse-reactions-list-emoji-${attrs.post.id}-${attrs.reaction.id}`,

  pointerOver(event) {
    if (event.pointerType !== "mouse") {
      return;
    }

    this._setupPopper(".user-list");

    if (!this.attrs.users?.length && !this.loadingReactions) {
      debounce(this, this._loadReactionUsers, 3000, true);
    }
  },

  html(attrs) {
    if (attrs.reaction.count <= 0) {
      return;
    }

    const reaction = attrs.reaction;
    const users = attrs.users || [];
    const displayUsers = [h("span.heading", attrs.reaction.id)];

    if (!users.length) {
      displayUsers.push(h("div.center", h("div.spinner.small")));
    } else {
      users.slice(0, DISPLAY_MAX_USERS).forEach((user) => {
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
            i18n("discourse_reactions.state_panel.more_users", {
              count: attrs.reaction.count - DISPLAY_MAX_USERS,
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
            : "",
        }),
      }),
    ];

    elements.push(h("div.user-list", h("div.container", displayUsers)));

    return elements;
  },

  _setupPopper(selector) {
    schedule("afterRender", () => {
      const elementId = CSS.escape(this.buildId(this.attrs));
      const trigger = document.querySelector(`#${elementId}`);
      const popperElement = document.querySelector(`#${elementId} ${selector}`);

      if (popperElement) {
        _popperReactionUserPanel && _popperReactionUserPanel.destroy();
        _popperReactionUserPanel = createPopper(trigger, popperElement, {
          placement: "bottom",
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

  _loadReactionUsers() {
    this.loadingReactions = true;
    this.callWidgetFunction("getUsers", this.attrs.reaction.id).finally(() => {
      this.loadingReactions = false;
    });
  },
});
