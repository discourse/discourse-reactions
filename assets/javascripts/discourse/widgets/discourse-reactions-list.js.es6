import { h } from "virtual-dom";
import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-list", {
  tagName: "div.discourse-reactions-list",

  html(attrs) {
    const reactions = attrs.post.reactions;

    return [
      h(
        "div.reactions",
        (reactions || [])
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
