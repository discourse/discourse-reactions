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

    if (attrs.statePanelExpanded) {
      classes.push("is-expanded");
    }

    return classes;
  },

  pointerOut(event) {
    if (event.pointerType !== "mouse") {
      return;
    }

    this.callWidgetFunction("scheduleCollapse", "collapseStatePanel");
  },

  pointerOver(event) {
    if (event.pointerType !== "mouse") {
      return;
    }

    this.callWidgetFunction("cancelCollapse");
  },

  showUsers(reactionId) {
    if (!this.state.displayedReactionId) {
      this.state.displayedReactionId = reactionId;
    } else if (this.state.displayedReactionId === reactionId) {
      this.hideUsers();
    } else if (this.state.displayedReactionId !== reactionId) {
      this.state.displayedReactionId = reactionId;
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

    const reactions = Object.keys(attrs.reactionsUsers).length
      ? h(
          "div.counters",
          attrs.post.reactions.map((reaction) =>
            this.attach("discourse-reactions-state-panel-reaction", {
              reaction,
              users: attrs.reactionsUsers[reaction.id],
              post: attrs.post,
              isDisplayed: reaction.id === this.state.displayedReactionId,
            })
          )
        )
      : h("div.spinner-container", h("div.spinner.small"));

    return h("div.container", reactions);
  },
});
