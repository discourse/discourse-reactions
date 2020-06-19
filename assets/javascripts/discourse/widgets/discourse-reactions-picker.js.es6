import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";

function extractCurrentUserReactions(user, reactions) {
  const usedReactions = [];

  reactions.forEach(reaction => {
    if (reaction.users.filterBy("uername", user.username)) {
      usedReactions.push(reaction.id);
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
            const isUsed = currentUserReactions.includes(reaction);
            return this.attach("button", {
              action: "toggleReaction",
              actionParam: { reaction, postId: attrs.post.id },
              className: `pickable-reaction ${isUsed ? "is-used" : ""}`,
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
