import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-picker", {
  tagName: "div.discourse-reactions-picker",

  buildKey: attrs => `discourse-reactions-picker-${attrs.post.id}`,

  mouseOut(event) {
    if (
      !this.site.mobileView &&
      !event.target.classList.contains("pickable-reaction") &&
      !event.target.classList.contains("container")
    ) {
      this.callWidgetFunction("scheduleCollapse");
    }
  },

  mouseOver() {
    if (!this.site.mobileView) {
      this.callWidgetFunction("cancelCollapse");
    }
  },

  html(attrs) {
    if (attrs.reactionsPickerExpanded) {
      return [
        h(
          "div.container",
          attrs.post.topic.valid_reactions.map(reaction => {
            const isUsed = attrs.post.current_user_reactions.findBy(
              "id",
              reaction
            );
            const canUndo = !isUsed || isUsed.can_undo;

            return this.attach("button", {
              action: "toggleReaction",
              actionParam: { reaction, postId: attrs.post.id, canUndo },
              className: `pickable-reaction ${reaction} ${
                canUndo ? "can-undo" : ""
              } ${isUsed ? "is-used" : ""}`,
              contents: [
                new RawHtml({
                  html: emojiUnescape(`:${reaction}:`)
                })
              ]
            });
          })
        )
      ];
    }
  }
});
