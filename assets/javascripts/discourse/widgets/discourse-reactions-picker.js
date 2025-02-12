import { h } from "virtual-dom";
import { emojiUnescape } from "discourse/lib/text";
import RawHtml from "discourse/widgets/raw-html";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-picker", {
  tagName: "div.discourse-reactions-picker",

  buildKey: (attrs) => `discourse-reactions-picker-${attrs.post.id}`,

  buildClasses(attrs) {
    const classes = [];

    if (attrs.reactionsPickerExpanded) {
      classes.push("is-expanded");
    }

    return classes;
  },

  pointerOut(event) {
    if (event.pointerType !== "mouse") {
      return;
    }

    this.callWidgetFunction("scheduleCollapse", "collapseReactionsPicker");
  },

  pointerOver() {
    if (event.pointerType !== "mouse") {
      return;
    }

    this.callWidgetFunction("cancelCollapse");
  },

  html(attrs) {
    if (attrs.reactionsPickerExpanded) {
      const reactions = this.siteSettings.discourse_reactions_enabled_reactions
        .split("|")
        .filter(Boolean);

      if (
        !reactions.includes(
          this.siteSettings.discourse_reactions_reaction_for_like
        )
      ) {
        reactions.unshift(
          this.siteSettings.discourse_reactions_reaction_for_like
        );
      }

      const currentUserReaction = attrs.post.current_user_reaction;
      return [
        h(
          `div.discourse-reactions-picker-container.col-${this._getOptimalColsCount(
            reactions.length
          )}`,
          reactions.map((reaction) => {
            let isUsed;
            let canUndo;

            if (
              reaction ===
              this.siteSettings.discourse_reactions_reaction_for_like
            ) {
              isUsed = attrs.post.current_user_used_main_reaction;
            } else {
              isUsed =
                currentUserReaction && currentUserReaction.id === reaction;
            }

            if (currentUserReaction) {
              canUndo =
                currentUserReaction.can_undo && attrs.post.likeAction.canToggle;
            } else {
              canUndo = attrs.post.likeAction.canToggle;
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
              action: "toggle",
              data: { reaction },
              actionParam: { reaction, postId: attrs.post.id, canUndo },
              className: `pickable-reaction ${reaction} ${
                canUndo ? "can-undo" : ""
              } ${isUsed ? "is-used" : ""}`,
              title,
              titleOptions,
              contents: [
                new RawHtml({
                  html: emojiUnescape(`:${reaction}:`),
                }),
              ],
            });
          })
        ),
      ];
    }
  },

  _getOptimalColsCount(count) {
    let x;
    const colsByRow = [5, 6, 7, 8];

    // if small count, just use it
    if (count < colsByRow[0]) {
      return count;
    }

    for (let index = 0; index < colsByRow.length; ++index) {
      const i = colsByRow[index];

      // if same as one of the max cols number, just use it
      let rest = count % i;
      if (rest === 0) {
        x = i;
        break;
      }

      // loop until we find a number limiting to the minimum the number
      // of empty cells
      if (index === 0) {
        x = i;
      } else {
        if (rest > count % (i - 1)) {
          x = i;
        }
      }
    }

    return x;
  },
});
