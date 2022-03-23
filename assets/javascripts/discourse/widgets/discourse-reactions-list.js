import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-list", {
  tagName: "div.discourse-reactions-list",

  html(attrs) {
    if (attrs.post.reaction_users_count <= 0) {
      return;
    }

    return [
      h(
        "div.reactions",
        attrs.post.reactions.map((reaction) =>
          this.attach("discourse-reactions-list-emoji", {
            reaction,
            users: attrs.state[reaction.id],
            post: attrs.post,
          })
        )
      ),
    ];
  },
});
