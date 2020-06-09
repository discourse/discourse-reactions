import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";
import { avatarFor } from "discourse/widgets/post";
import { next } from "@ember/runloop";
import {
  cachePostReactions,
  fetchPostReactions
} from "discourse/plugins/discourse-reactions/initializers/discourse-reactions";

export default createWidget("discourse-reactions-state-panel", {
  tagName: "div.discourse-reactions-state-panel",

  buildKey: attrs => `discourse-reactions-state-panel-${attrs.post.id}`,

  mouseOut(event) {
    this.callWidgetFunction("scheduleCollapseStatePanel", event);
  },

  init(attrs) {
    if (attrs.statePanelExpanded) {
      const postId = attrs.post.id;
      const reactions = fetchPostReactions(postId);

      if (reactions) {
        next(() => {
          this.state.reactions = reactions;
        });
      } else {
        this.store
          .findAll("discourse-reactions-custom-reaction", {
            post_id: postId
          })
          .then(result => {
            cachePostReactions(postId, result.content);
            this.state.reactions = result.content;
            this.state.displayedReactionId = result.content.firstObject.id;
            this.scheduleRerender();
          });
      }
    }
  },

  onChangeDisplayedReaction(reactionId) {
    this.state.displayedReactionId = reactionId;
  },

  defaultState() {
    return { displayedReactionId: null, reactions: [] };
  },

  html(attrs) {
    if (!attrs.statePanelExpanded) return;
    if (!this.state.displayedReactionId) return;
    if (!this.state.reactions.length) return;

    const displayedReaction = this.state.reactions.findBy(
      "id",
      this.state.displayedReactionId
    );
    if (!displayedReaction) return;

    return h("div.container", [
      h(
        "div.counters",
        this.state.reactions.map(reaction =>
          this.attach("discourse-reactions-state-panel-reaction", {
            reaction,
            isDisplayed: reaction.id === this.state.displayedReactionId
          })
        )
      ),
      h(
        "div.users",
        displayedReaction.users.map(user =>
          avatarFor("tiny", {
            username: user.username,
            template: user.avatar_template
          })
        )
      )
    ]);
  }
});
