import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-double-button", {
  tagName: "div.discourse-reactions-double-button",

  buildKey: (attrs) => `discourse-reactions-double-button-${attrs.post.id}`,

  html(attrs) {
    const items = [];
    const count = attrs.post.reaction_users_count;

    if (count > 0) {
      items.push(this.attach("discourse-reactions-counter", attrs));
    }

    if (!attrs.post.yours) {
      items.push(this.attach("discourse-reactions-reaction-button", attrs));
    }

    return items;
  },
});
