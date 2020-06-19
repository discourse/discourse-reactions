import I18n from "I18n";
import { h } from "virtual-dom";
import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-list", {
  tagName: "div.discourse-reactions-list",

  html(attrs) {
    const reactions = attrs.post.reactions;
    const sum = (acc, current) => acc + current.count;
    const count = attrs.post.reactions.reduce(sum, 0);

    return [
      h(
        "div.reactions",
        reactions.map(reaction =>
          h(
            "span.reaction",
            new RawHtml({
              html: emojiUnescape(`:${reaction.id}:`)
            })
          )
        )
      ),
      h(
        "span.users",
        I18n.t("discourse_reactions.discourse_reactions_list.reactions_count", {
          count
        })
      )
    ];
  }
});
