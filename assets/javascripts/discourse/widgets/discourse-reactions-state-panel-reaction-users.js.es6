import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";
import { avatarFor } from "discourse/widgets/post";
import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { iconNode } from "discourse-common/lib/icon-library";
import I18n from "I18n";

export default createWidget("discourse-reactions-state-panel-reaction-users", {
  tagName: "div.discourse-reactions-state-panel-reaction-users",

  buildKey: attrs =>
    `discourse-reactions-state-panel-reaction-users-${attrs.post.id}`,

  html(attrs) {
    if (
      !attrs.displayedReaction ||
      !attrs.displayedReaction.users ||
      !attrs.displayedReaction.users.length
    ) {
      return;
    }

    const elements = [];
    const displayedUsers = attrs.displayedReaction.users.slice(0, 20);

    elements.push(
      h("div.header-buttons", [
        h("div.selected-reaction", [
          new RawHtml({
            html: emojiUnescape(`:${attrs.displayedReaction.id}:`)
          }),
          h("div.count", attrs.displayedReaction.count.toString())
        ]),
        this.attach("button", {
          action: "hideUsers",
          contents: [iconNode("chevron-left")],
          className: "hide-users",
          title: ""
        })
      ])
    );

    elements.push(
      h(
        "div.users",
        displayedUsers.map(user =>
          avatarFor("tiny", {
            username: user.username,
            template: user.avatar_template
          })
        )
      )
    );

    if (attrs.displayedReaction.users.length > 20) {
      elements.push(
        h(
          "div.other-users",
          I18n.t("discourse_reactions.state_panel.more_users", {
            count: attrs.displayedReaction.users.length - 20
          })
        )
      );
    }

    return [, h("div.user-container", elements)];
  }
});
