import I18n from "I18n";
import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";
import { avatarFor } from "discourse/widgets/post";
import { iconNode } from "discourse-common/lib/icon-library";

const MAX_USERS_COUNT = 26;
const MIN_USERS_COUNT = 8;

export default createWidget("discourse-reactions-state-panel-reaction", {
  tagName: "div.discourse-reactions-state-panel-reaction",

  buildClasses(attrs) {
    if (attrs.isDisplayed) {
      return "is-displayed";
    }
  },

  html(attrs) {
    const elements = [];

    elements.push(
      h("div.reaction-wrapper", [
        h("div.emoji-wrapper", [
          new RawHtml({
            html: emojiUnescape(`:${attrs.reaction.id}:`)
          })
        ]),
        h("div.count", attrs.reaction.count.toString())
      ])
    );

    const firsLineUsers = attrs.reaction.users.slice(0, MIN_USERS_COUNT);
    const list = firsLineUsers.map(user =>
      avatarFor("tiny", {
        username: user.username,
        template: user.avatar_template
      })
    );

    if (attrs.reaction.users.length > MIN_USERS_COUNT) {
      list.push(
        this.attach("button", {
          action: "showUsers",
          contents: [
            iconNode(attrs.isDisplayed ? "chevron-up" : "chevron-down")
          ],
          actionParam: attrs,
          className: "show-users",
          title: ""
        })
      );
    }

    if (attrs.isDisplayed) {
      list.push(
        attrs.reaction.users.slice(MIN_USERS_COUNT, MAX_USERS_COUNT).map(user =>
          avatarFor("tiny", {
            username: user.username,
            template: user.avatar_template
          })
        )
      );
    }

    let more;
    if (attrs.isDisplayed && attrs.reaction.count > MAX_USERS_COUNT) {
      more = I18n.t("discourse_reactions.state_panel.more_users", {
        count: attrs.reaction.count - MAX_USERS_COUNT
      });
    }

    const columnsCount =
      attrs.reaction.users.length > MIN_USERS_COUNT
        ? firsLineUsers.length + 1
        : firsLineUsers.length;

    elements.push(
      h("div.users", [
        h(`div.list.list-columns-${columnsCount}`, list),
        h("span.more", more)
      ])
    );

    return elements;
  }
});
