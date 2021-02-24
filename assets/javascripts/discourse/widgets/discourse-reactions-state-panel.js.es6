import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-state-panel", {
  tagName: "div.discourse-reactions-state-panel",

  buildKey: attrs => `discourse-reactions-state-panel-${attrs.post.id}`,

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

  showUsers(attrs) {
    this.state.displayedReactionId = attrs.reaction.id;
  },

  hideUsers() {
    this.state.displayedReactionId = null;
  },

  defaultState() {
    return {
      displayedReactionId: null
    };
  },

  html(attrs) {
    if (!attrs.statePanelExpanded || !attrs.post.reactions.length) {
      return;
    }

    if (this.state.displayedReactionId) {
      const displayedReaction = attrs.post.reactions.findBy(
        "id",
        this.state.displayedReactionId
      );

      return this.attach("discourse-reactions-state-panel-reaction-users", {
        displayedReaction,
        post: attrs.post
      });
    }

    const sortedReactions = attrs.post.reactions.sortBy("count").reverse();

    return [
      ,
      h(
        "div.container",
        h(
          "div.counters",
          sortedReactions.map(reaction =>
            this.attach("discourse-reactions-state-panel-reaction", {
              reaction,
              isDisplayed: reaction.id === this.state.displayedReactionId
            })
          )
        )
      )
    ];
  }
});
