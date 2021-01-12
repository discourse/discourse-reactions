import { h } from "virtual-dom";
import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-list", {
  tagName: "div.discourse-reactions-list",

  html(attrs) {
    const reactions = attrs.post.reactions;
    const currentUserReaction = attrs.post.current_user_reaction;

    if (attrs.post.reaction_users_count <= 0) {
      return;
    }

    if(currentUserReaction && reactions.length == 1) {
      return;
    }

    return [
      h(
        "div.reactions",
        reactions
          .sortBy("count")
          .reverse()
          .map(reaction =>
            h(
              `span.reaction.${reaction.id}`,
              new RawHtml({
                html: emojiUnescape(`:${reaction.id}:`)
              })
            )
          )
      )
    ];
  }
});
