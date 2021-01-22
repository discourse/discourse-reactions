import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";
import I18n from "I18n";
import { later, cancel } from "@ember/runloop";

let _laterHoverHandlers = {};

export default createWidget("discourse-reactions-counter", {
  tagName: "div.discourse-reactions-counter",

  buildKey: attrs => `discourse-reactions-counter-${attrs.post.id}`,

  click(event) {
    this._cancelHoverHandler();

    if (!this.capabilities.touch) {
      this.callWidgetFunction("toggleStatePanel", event);
    }
  },

  touchStart(event) {
    if (this.capabilities.touch) {
      this.callWidgetFunction("toggleStatePanel", event);
      event.preventDefault();
      event.stopPropagation();
    }
  },

  mouseOver(event) {
    this._cancelHoverHandler();

    if (!window.matchMedia("(hover: none)").matches) {
      _laterHoverHandlers[this.attrs.post.id] = later(
        this,
        this._hoverHandler,
        event,
        500
      );
    }
  },

  mouseOut() {
    this._cancelHoverHandler();

    if (!window.matchMedia("(hover: none)").matches) {
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

  buildClasses(attrs) {
    const classes = [];
    const mainReaction = this.siteSettings
      .discourse_reactions_reaction_for_like;

    if (
      attrs.post.reactions.length == 1 &&
      attrs.post.reactions[0].id == mainReaction
    ) {
      classes.push("only-like");
    }

    return classes;
  },

  html(attrs) {
    if (attrs.post.reaction_users_count) {
      const count = attrs.post.reaction_users_count;
      const mainReaction = this.siteSettings
        .discourse_reactions_reaction_for_like;
      const items = [];

      if (count <= 0) {
        return;
      }

      if (
        !(
          attrs.post.reactions.length == 1 &&
          attrs.post.reactions[0].id == mainReaction
        )
      ) {
        items.push(this.attach("discourse-reactions-list", attrs));
      }

      items.push(h("div.reactions-counter", count.toString()));

      return items;
    }
  },

  _cancelHoverHandler() {
    const handler = _laterHoverHandlers[this.attrs.post.id];
    handler && cancel(handler);
  },

  _hoverHandler(event) {
    this.callWidgetFunction("cancelCollapse");
    this.callWidgetFunction("toggleStatePanel", event);
  }
});
