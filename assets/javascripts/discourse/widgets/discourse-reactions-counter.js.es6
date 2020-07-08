import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-counter", {
  tagName: "div.discourse-reactions-counter",

  buildKey: attrs => `discourse-reactions-counter-${attrs.post.id}`,

  click(event) {
    if (!this.site.mobileView) {
      this.callWidgetFunction("toggleStatePanel", event);
    }
  },

  touchStart(event) {
    if (this.site.mobileView) {
      this.callWidgetFunction("toggleStatePanel", event);
      event.preventDefault();
      event.stopPropagation();
    }
  },

  mouseOut() {
    if (!this.site.mobileView) {
      this.callWidgetFunction("scheduleCollapse");
    }
  },

  mouseOver(event) {
    if (!this.site.mobileView) {
      this.callWidgetFunction("cancelCollapse");
      this.callWidgetFunction("toggleStatePanel", event);
    }
  },

  html(attrs) {
    if (attrs.post.reaction_users_count) {
      const count = attrs.post.reaction_users_count;

      if (count <= 0) {
        return;
      }

      return [
        this.attach("discourse-reactions-list", attrs),
        h("div.reactions-counter", count.toString())
      ];
    }
  }
});
