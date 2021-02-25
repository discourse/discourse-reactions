import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";
import { avatarFor } from "discourse/widgets/post";
import { iconNode } from "discourse-common/lib/icon-library";

export default createWidget("discourse-reactions-state-panel-reaction", {
  tagName: "div.discourse-reactions-state-panel-reaction",

  buildClasses(attrs) {
    if (attrs.isDisplayed) {
      return "is-displayed";
    }
  },

  html(attrs) {
    const displayUsers = attrs.reaction.users.slice(0, 8);

    const elements = [];

    elements.push(
      h("div.reaction-wrapper", [
        new RawHtml({
          html: emojiUnescape(`:${attrs.reaction.id}:`)
        }),
        h("div.count", attrs.reaction.count.toString())
      ])
    );

    displayUsers.map(user =>
      elements.push(
        avatarFor("tiny", {
          username: user.username,
          template: user.avatar_template
        })
      )
    );

    if (attrs.reaction.users.length > 8) {
      elements.push(
        this.attach("button", {
          action: "showUsers",
          contents: [iconNode("chevron-right")],
          data: attrs.reaction,
          actionParam: attrs,
          className: "show-users",
          title: ""
        })
      );
    }

    return elements;
  }
});
