import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";
import I18n from "I18n";
import { later, cancel } from "@ember/runloop";

export default createWidget("discourse-reactions-counter", {
  tagName: "div.discourse-reactions-counter",

  buildKey: attrs => `discourse-reactions-counter-${attrs.post.id}`,

  click(event) {
    this._cancelHoverHandler();

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

  mouseOver(event) {
    this._cancelHoverHandler();

    if (!this.site.mobileView) {
      this._laterHoverHandler = later(this, this._hoverHandler, event, 500);
    }
  },

  mouseOut() {
    this._cancelHoverHandler();

    if (!this.site.mobileView) {
      this.callWidgetFunction("scheduleCollapse");
    }
  },

  buildAttributes(attrs) {
    return {
      title: I18n.t("discourse_reactions.users_reacted", {
        count: attrs.post.reaction_users_count
      })
    };
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
  },

  _cancelHoverHandler() {
    this._laterHoverHandler && cancel(this._laterHoverHandler);
  },

  _hoverHandler(event) {
    this.callWidgetFunction("cancelCollapse");
    this.callWidgetFunction("toggleStatePanel", event);
  }
});
