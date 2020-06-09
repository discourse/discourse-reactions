import { iconNode } from "discourse-common/lib/icon-library";
import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-reaction-button", {
  tagName: "div.discourse-reactions-reaction-button",

  buildKey: attrs => `discourse-reactions-reaction-button-${attrs.post.id}`,

  click() {
    if (!this.site.mobileView) {
      this.callWidgetFunction("toggleLike");
    }
  },

  touchStart() {
    if (this.site.mobileView) {
      this._touchStartAt = Date.now();
      return false;
    }
  },

  touchEnd(event) {
    if (this.site.mobileView) {
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
    if (!this.site.mobileView) {
      this.callWidgetFunction("toggleReactions", event);
    }
  },

  mouseOut(event) {
    if (!this.site.mobileView) {
      this.callWidgetFunction("scheduleCollapseReactionsPicker", event);
    }
  },

  html(attrs) {
    const likeIcon = this.siteSettings.discourse_reactions_like_icon;
    const icon = attrs.post.liked ? likeIcon : `far-${likeIcon}`;

    return h(
      "button.btn-flat.fade-out.btn-reaction.toggle-like.like.btn-icon.no-text",
      [iconNode(icon)]
    );
  }
});
