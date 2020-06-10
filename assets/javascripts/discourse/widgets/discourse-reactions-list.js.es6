import I18n from "I18n";
import { h } from "virtual-dom";
import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-list", {
  tagName: "div.discourse-reactions-list",

  html() {
    // TODO should come from actions_summary
    const count = 2;
    const reactions = ["thumbsup", "smile"];

    return [
      h(
        "div.reactions",
        reactions.map(reaction =>
          h(
            "span.reaction",
            new RawHtml({
              html: emojiUnescape(`:${reaction}:`)
            })
          )
        )
      ),
      h(
        "span.users",
        I18n.t("discourse_reactions.discourse_reactions_list.users_reacted", {
          count
        })
      )
    ];
  }
});
