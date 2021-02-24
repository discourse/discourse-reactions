import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";
import { avatarFor } from "discourse/widgets/post";
import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { iconNode } from "discourse-common/lib/icon-library";

export default createWidget("discourse-reactions-state-panel-reaction-users", {
  tagName: "div.discourse-reactions-state-panel-reaction-users",

  buildKey: attrs =>
    `discourse-reactions-state-panel-reaction-users-${attrs.post.id}`,

  html(attrs) {
    return [
      ,
      h("div.user-container", [
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
        ]),
        h(
          "div.users",
          attrs.displayedReaction.users.map(user =>
            avatarFor("tiny", {
              username: user.username,
              template: user.avatar_template
            })
          )
        )
      ])
    ];
  }
});
