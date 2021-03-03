import { createWidget } from "discourse/widgets/widget";
import { h } from "virtual-dom";
import { iconNode } from "discourse-common/lib/icon-library";

export default createWidget("discourse-reactions-double-button", {
  tagName: "div.discourse-reactions-double-button",

  buildKey: attrs => `discourse-reactions-double-button-${attrs.post.id}`,

  html(attrs) {
    const items = [];
    const mainReactionIcon = this.siteSettings.discourse_reactions_like_icon;
    const count = attrs.post.reaction_users_count;

    if (count > 0) {
      items.push(this.attach("discourse-reactions-counter", attrs));
    }

    if (attrs.post.yours) {
      items.push(
        h(
          "div.discourse-reactions-reaction-button.my-likes",
          h(
            "button.btn-toggle-reaction-like.btn-icon.no-text.reaction-button",
            [iconNode(`${mainReactionIcon}`)]
          )
        )
      );
    } else {
      items.push(this.attach("discourse-reactions-reaction-button", attrs));
    }

    return items;
  }
});
