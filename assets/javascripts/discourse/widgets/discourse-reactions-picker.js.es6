import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-picker", {
  tagName: "div.discourse-reactions-picker",

  buildKey: attrs => `discourse-reactions-picker-${attrs.post.id}`,

  mouseOut() {
    if (!window.matchMedia("(hover: none)").matches) {
      this.callWidgetFunction("scheduleCollapse");
    }
  },

  mouseOver() {
    if (!window.matchMedia("(hover: none)").matches) {
      this.callWidgetFunction("cancelCollapse");
    }
  },

  html(attrs) {
    if (attrs.reactionsPickerExpanded) {
      const post = attrs.post;
      return [
        h(
          "div.container",
          post.topic.valid_reactions.map(reaction => {
            let isUsed;
            let canUndo;
            if (
              reaction ===
              this.siteSettings.discourse_reactions_reaction_for_like
            ) {
              isUsed = post.current_user_used_main_reaction;
            } else {
              isUsed =
                post.current_user_reaction &&
                post.current_user_reaction.id === reaction;
            }

            if (post.current_user_reaction) {
              canUndo =
                post.current_user_reaction.can_undo &&
                post.likeAction.canToggle;
            } else {
              canUndo = post.likeAction.canToggle;
            }

            let title;
            let titleOptions;
            if (canUndo) {
              title = "discourse_reactions.picker.react_with";
              titleOptions = { reaction };
            } else {
              title = "discourse_reactions.picker.cant_remove_reaction";
            }

            return this.attach("button", {
              action: "toggleReaction",
              data: { reaction },
              actionParam: { reaction, postId: post.id, canUndo },
              className: `pickable-reaction ${reaction} ${
                canUndo ? "can-undo" : ""
              } ${isUsed ? "is-used" : ""}`,
              title,
              titleOptions,
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
