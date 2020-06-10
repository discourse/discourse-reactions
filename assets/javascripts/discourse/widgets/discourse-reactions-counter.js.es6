import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-counter", {
  tagName: "div.discourse-reactions-counter",

  buildKey: attrs => `discourse-reactions-counter-${attrs.post.id}`,

  mouseOut(event) {
    if (!this.site.mobileView) {
      this.callWidgetFunction("scheduleCollapseStatePanel", event);
    }
  },

  mouseOver(event) {
    if (!this.site.mobileView) {
      this.callWidgetFunction("toggleStatePanel", event);
    }
  },

  click(event) {
    this.callWidgetFunction("toggleStatePanel", event);
  },

  html(attrs) {
    if (attrs.post.likeCount) {
      return h(
        "button.btn-flat.fade-out.btn-default.btn-reaction-counter",
        attrs.post.likeCount.toString()
      );
    }
  }
});
