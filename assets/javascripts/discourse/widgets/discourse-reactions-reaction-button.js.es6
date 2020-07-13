import { iconNode } from "discourse-common/lib/icon-library";
import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";
import { later, cancel } from "@ember/runloop";

export default createWidget("discourse-reactions-reaction-button", {
  tagName: "div.discourse-reactions-reaction-button",

  buildKey: attrs => `discourse-reactions-reaction-button-${attrs.post.id}`,

  click() {
    if (!this.site.mobileView) {
      this.callWidgetFunction("toggleLike");
    }
  },

  mouseOver(event) {
    this._laterHoverHandler && cancel(this._laterHoverHandler);

    if (!this.site.mobileView) {
      this._laterHoverHandler = later(this, this._hoverHandler, event, 500);
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
    const hasPositivelyReacted = attrs.post.user_positively_reacted;
    const icon = hasPositivelyReacted
      ? mainReactionIcon
      : `far-${mainReactionIcon}`;

    return h(`button.btn-toggle-reaction.btn-icon.no-text`, [iconNode(icon)]);
  },

  _hoverHandler(event) {
    this.callWidgetFunction("cancelCollapse");
    this.callWidgetFunction("toggleReactions", event);
  }
});
