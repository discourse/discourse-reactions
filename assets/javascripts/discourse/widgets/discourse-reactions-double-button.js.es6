import { createWidget } from "discourse/widgets/widget";
import { h } from "virtual-dom";
import { iconNode } from "discourse-common/lib/icon-library";

export default createWidget("discourse-reactions-double-button", {
  tagName: "div.double-button",

  buildKey: attrs => `double-button-${attrs.post.id}`,

  buildClasses(attrs) {
    const classes = [];
    if (
      attrs.post.likeAction &&
      (attrs.post.likeAction.canToggle || attrs.post.likeAction.can_undo)
    ) {
      classes.push("can-toggle-main-reaction");
    }

    return classes;
  },

  html(attrs) {
    const items = [];
    const mainReactionIcon = this.siteSettings.discourse_reactions_like_icon;

    if (attrs.post.yours) {
      items.push(this.attach("discourse-reactions-counter", attrs));
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
      items.push(this.attach("discourse-reactions-counter", attrs));
      items.push(this.attach("discourse-reactions-reaction-button", attrs));
    }

    return items;
  }
});
