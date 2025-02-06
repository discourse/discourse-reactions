import { h } from "virtual-dom";
import { iconNode } from "discourse/lib/icon-library";
import { emojiUnescape } from "discourse/lib/text";
import { avatarFor } from "discourse/widgets/post";
import RawHtml from "discourse/widgets/raw-html";
import { createWidget } from "discourse/widgets/widget";
import { i18n } from "discourse-i18n";

const MAX_USERS_COUNT = 26;
const MIN_USERS_COUNT = 8;

export default createWidget("discourse-reactions-state-panel-reaction", {
  tagName: "div.discourse-reactions-state-panel-reaction",

  buildClasses(attrs) {
    if (attrs.isDisplayed) {
      return "is-displayed";
    }
  },

  click(event) {
    if (event?.target?.classList?.contains("show-users")) {
      event.preventDefault();
      event.stopPropagation();

      this.sendWidgetAction("showUsers", this.attrs?.reaction?.id);
    }
  },

  html(attrs) {
    const elements = [];

    if (!attrs.users) {
      return;
    }

    elements.push(
      h("div.reaction-wrapper", [
        h("div.emoji-wrapper", [
          new RawHtml({
            html: emojiUnescape(`:${attrs.reaction.id}:`),
          }),
        ]),
        h("div.count", attrs.reaction.count.toString()),
      ])
    );

    const firsLineUsers = attrs.users.slice(0, MIN_USERS_COUNT);
    const list = firsLineUsers.map((user) =>
      avatarFor("tiny", {
        username: user.username,
        template: user.avatar_template,
      })
    );

    if (attrs.users.length > MIN_USERS_COUNT) {
      list.push(
        h(
          "button.show-users",
          iconNode(attrs.isDisplayed ? "chevron-up" : "chevron-down")
        )
      );
    }

    if (attrs.isDisplayed) {
      list.push(
        attrs.users.slice(MIN_USERS_COUNT, MAX_USERS_COUNT).map((user) =>
          avatarFor("tiny", {
            username: user.username,
            template: user.avatar_template,
          })
        )
      );
    }

    let more;
    if (attrs.isDisplayed && attrs.reaction.count > MAX_USERS_COUNT) {
      more = i18n("discourse_reactions.state_panel.more_users", {
        count: attrs.reaction.count - MAX_USERS_COUNT,
      });
    }

    const columnsCount =
      attrs.users.length > MIN_USERS_COUNT
        ? firsLineUsers.length + 1
        : firsLineUsers.length;

    elements.push(
      h("div.users", [
        h(`div.list.list-columns-${columnsCount}`, list),
        h("span.more", more),
      ])
    );

    return elements;
  },
});
