import I18n from "I18n";
import { iconNode } from "discourse-common/lib/icon-library";
import { emojiUrlFor } from "discourse/lib/text";
import { h } from "virtual-dom";
import { createWidget } from "discourse/widgets/widget";
import { later, cancel } from "@ember/runloop";

let _laterHoverHandlers = {};

export default createWidget("discourse-reactions-reaction-button", {
  tagName: "div.discourse-reactions-reaction-button",

  buildKey: attrs => `discourse-reactions-reaction-button-${attrs.post.id}`,

  click() {
    this._cancelHoverHandler();
    const hasUsedMainReaction = this.attrs.post.current_user_used_main_reaction;
    const currentUserReaction = this.attrs.post.current_user_reaction;

    if (!this.capabilities.touch) {
      if (hasUsedMainReaction) {
        this.callWidgetFunction("toggleLike");
      } else if (currentUserReaction) {
        this.callWidgetFunction("toggleReaction", {
          reaction: currentUserReaction.id,
          postId: this.attrs.post.id,
          canUndo: currentUserReaction.can_undo
        });
      } else {
        this.callWidgetFunction("toggleLike");
      }
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
    let title;
    let options;
    const likeAction = attrs.post.likeAction;
    const currentUserReaction = this.attrs.post.current_user_reaction;

    if (!likeAction) {
      return;
    }

    if (likeAction.canToggle && !likeAction.hasOwnProperty("can_undo")) {
      title = "discourse_reactions.main_reaction.add";
    }

    if (likeAction.canToggle && likeAction.can_undo) {
      title = "discourse_reactions.main_reaction.remove";
    }

    if (!likeAction.canToggle) {
      title = "discourse_reactions.main_reaction.cant_remove";
    }

    // used !likeAction.hasOwnProperty("can_undo") rather than !likeAction.can_undo
    // to check whether can_undo property is present or not irrsepective of its value

    if (
      currentUserReaction &&
      currentUserReaction.can_undo &&
      !likeAction.hasOwnProperty("can_undo")
    ) {
      title = "discourse_reactions.picker.remove_reaction";
      options = { reaction: currentUserReaction.id };
    }

    if (
      currentUserReaction &&
      !currentUserReaction.can_undo &&
      !likeAction.hasOwnProperty("can_undo")
    ) {
      title = "discourse_reactions.picker.cant_remove_reaction";
    }

    return options
      ? { title: I18n.t(title, options) }
      : { title: I18n.t(title) };
  },

  html(attrs) {
    const mainReactionIcon = this.siteSettings.discourse_reactions_like_icon;
    const hasUsedMainReaction = attrs.post.current_user_used_main_reaction;
    const currentUserReaction = attrs.post.current_user_reaction;

    if (hasUsedMainReaction) {
      return h(
        "button.btn-toggle-reaction-like.btn-icon.no-text.reaction-button",
        [iconNode(mainReactionIcon)]
      );
    }

    if (currentUserReaction) {
      return h(
        "button.btn-icon.no-text.reaction-button",
        h("img.btn-toggle-reaction-emoji.reaction-button", {
          src: emojiUrlFor(currentUserReaction.id),
          alt: `:${currentUserReaction.id}:`
        })
      );
    }

    return h(
      "button.btn-toggle-reaction-like.btn-icon.no-text.reaction-button",
      [iconNode(`far-${mainReactionIcon}`)]
    );
  },

  _cancelHoverHandler() {
    const handler = _laterHoverHandlers[this.attrs.post.id];
    handler && cancel(handler);
  },

  _hoverHandler(event) {
    this.callWidgetFunction("cancelCollapse");
    this.callWidgetFunction("toggleReactions", event);
  }
});
