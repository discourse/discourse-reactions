import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";

function extractCurrentUserReactions(user, reactions) {
  const usedReactions = [];

  reactions.forEach(reaction => {
    const userReaction = reaction.users.findBy("username", user.username);
    if (userReaction) {
      usedReactions.push({
        id: reaction.id,
        type: reaction.type,
        can_undo: userReaction.can_undo
      });
    }
  });

  return usedReactions;
}

export default createWidget("discourse-reactions-picker", {
  tagName: "div.discourse-reactions-picker",

  buildKey: attrs => `discourse-reactions-picker-${attrs.post.id}`,

  mouseOut(event) {
    this.callWidgetFunction("collapseReactionsPicker", event);
  },

  html(attrs) {
    if (attrs.reactionsPickerExpanded) {
      const currentUserReactions = extractCurrentUserReactions(
        this.currentUser,
        attrs.post.reactions
      );

      return [
        this.attach("fake-zone", {
          collapseFunction: "collapseReactionsPicker"
        }),
        h(
          "div.container",
          attrs.post.topic.valid_reactions.map(reaction => {
            const isUsed = currentUserReactions.findBy("id", reaction);
            const canUndo = !isUsed || isUsed.can_undo;

            return this.attach("button", {
              action: "toggleReaction",
              actionParam: { reaction, postId: attrs.post.id, canUndo },
              className: `pickable-reaction ${canUndo ? "can-undo" : ""} ${
                isUsed ? "is-used" : ""
              }`,
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
