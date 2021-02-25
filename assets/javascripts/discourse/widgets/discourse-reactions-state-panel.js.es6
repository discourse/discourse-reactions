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
    if (!this.state.displayedReactionId) {
      this.state.displayedReactionId = attrs.reaction.id;
    } else if (this.state.displayedReactionId === attrs.reaction.id) {
      this.hideUsers();
    } else if (this.state.displayedReactionId !== attrs.reaction.id) {
      this.state.displayedReactionId = attrs.reaction.id;
    }
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
              post: attrs.post,
              isDisplayed: reaction.id === this.state.displayedReactionId
            })
          )
        )
      )
    ];
  }
});
