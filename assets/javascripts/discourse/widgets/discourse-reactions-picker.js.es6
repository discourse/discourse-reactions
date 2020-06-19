import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-picker", {
  tagName: "div.discourse-reactions-picker",

  buildKey: attrs => `discourse-reactions-picker-${attrs.post.id}`,

  mouseOut(event) {
    this.callWidgetFunction("collapseReactionsPicker", event);
  },

  html(attrs) {
    if (attrs.reactionsPickerExpanded) {
      return [
        h("div.fake-zone"),
        h(
          "div.container",
          attrs.post.topic.valid_reactions.map(reaction =>
            this.attach("button", {
              action: "toggleReaction",
              actionParam: { reaction, postId: attrs.post.id },
              className: "pickable-reaction",
              contents: [
                new RawHtml({
                  html: emojiUnescape(`:${reaction}:`)
                })
              ]
            })
          )
        )
      ];
    }
  }
});
