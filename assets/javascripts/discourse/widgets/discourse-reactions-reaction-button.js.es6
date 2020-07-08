import { iconNode } from "discourse-common/lib/icon-library";
import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";
import { later, cancel } from "@ember/runloop";

export default createWidget("discourse-reactions-reaction-button", {
  tagName: "div.discourse-reactions-reaction-button",

  buildKey: attrs => `discourse-reactions-reaction-button-${attrs.post.id}`,

  init() {
    this._laterHoverHandler = null;
  },

  click() {
    if (!this.site.mobileView) {
      this.callWidgetFunction("toggleLike");
    }
  },

  touchStart() {
    this._touchTimeout && cancel(this._touchTimeout);

    if (this.site.mobileView) {
      const root = document.getElementsByTagName("html")[0];
      root && root.classList.add("no-select");

      this._touchStartAt = Date.now();
      this._touchTimeout = later(() => {
        this._touchStartAt = null;
        this.callWidgetFunction("toggleReactions");
      }, 400);
      return false;
    }
  },

  touchEnd(event) {
    this._touchTimeout && cancel(this._touchTimeout);

    const root = document.getElementsByTagName("html")[0];
    root && root.classList.remove("no-select");

    // if (this.site.mobileView) {
    //   const touch = event.originalEvent.touches[0];
    //   if (touch.classList.contains("pickable-reaction")) {
    //     touch.click();
    //   }
    // }

    if (this.site.mobileView && this._touchStartAt) {
      const duration = Date.now() - (this._touchStartAt || 0);
      this._touchStartAt = null;
      if (duration > 400) {
        this.callWidgetFunction("toggleReactions", event);
      } else {
        this.callWidgetFunction("toggleLike");
      }
    }
  },

  mouseOver(event) {
    this._laterHoverHandler && cancel(this._laterHoverHandler);

    if (!this.site.mobileView) {
      this._laterHoverHandler = later(() => {
        this.callWidgetFunction("cancelCollapse");
        this.callWidgetFunction("toggleReactions", event);
      }, 250);
    }
  },

  mouseOut() {
    this._laterHoverHandler && cancel(this._laterHoverHandler);

    if (!this.site.mobileView) {
      this.callWidgetFunction("scheduleCollapse");
    }
  },

  html(attrs) {
    const mainReactionIcon = this.siteSettings.discourse_reactions_like_icon;
    const hasReactions = attrs.post.default_reaction_used;
    const icon = hasReactions ? mainReactionIcon : `far-${mainReactionIcon}`;

    return h(`button.btn-toggle-reaction.btn-icon.no-text`, [iconNode(icon)]);
  }
});
