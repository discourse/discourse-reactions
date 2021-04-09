import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-state-panel", {
  tagName: "div.discourse-reactions-state-panel",

  buildKey: (attrs) => `discourse-reactions-state-panel-${attrs.post.id}`,

  buildClasses(attrs) {
    const classes = [];

    if (attrs.post && attrs.post.reactions) {
      const maxCount = Math.max(...attrs.post.reactions.mapBy("count"));
      const charsCount = maxCount.toString().length;
      classes.push(`max-length-${charsCount}`);
    }

    return classes;
  },

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
      displayedReactionId: null,
    };
  },

  html(attrs) {
    if (!attrs.statePanelExpanded || !attrs.post.reactions.length) {
      return;
    }

    const reactions = attrs.state.postIds.includes(attrs.post.id)
      ? h(
          "div.counters",
          attrs.post.reactions.map((reaction) =>
            this.attach("discourse-reactions-state-panel-reaction", {
              reaction,
              users: attrs.state[reaction.id],
              post: attrs.post,
              isDisplayed: reaction.id === this.state.displayedReactionId,
            })
          )
        )
      : h("div.spinner-container", h("div.spinner"));

    return [, h("div.container", reactions)];
  },
});
