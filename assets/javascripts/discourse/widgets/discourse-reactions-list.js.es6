import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-list", {
  tagName: "div.discourse-reactions-list",

  html(attrs) {
    const reactions = attrs.post.reactions;

    if (attrs.post.reaction_users_count <= 0) {
      return;
    }

    return [
      h(
        "div.reactions",
        reactions
          .sortBy("count")
          .reverse()
          .map(reaction =>
            this.attach("discourse-reactions-list-emoji", {
              reaction,
              post: attrs.post
            })
          )
      )
    ];
  }
});
