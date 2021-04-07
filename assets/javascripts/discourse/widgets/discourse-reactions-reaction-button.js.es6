import { isBlank } from "@ember/utils";
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
    const currentUserReaction = this.attrs.post.current_user_reaction;
    if (!this.capabilities.touch || !this.site.mobileView) {
      this.callWidgetFunction("toggleFromButton", {
        reaction: currentUserReaction
          ? currentUserReaction.id
          : this.siteSettings.discourse_reactions_reaction_for_like
      });
    }
  },

  mouseOver(event) {
    this._cancelHoverHandler();

    const likeAction = this.attrs.post.likeAction;
    const currentUserReaction = this.attrs.post.current_user_reaction;
    if (
      currentUserReaction &&
      !currentUserReaction.can_undo &&
      (!likeAction || isBlank(likeAction.can_undo))
    ) {
      return;
    }

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
    const likeAction = attrs.post.likeAction;
    if (!likeAction) {
      return;
    }

    let title;
    let options;
    const currentUserReaction = this.attrs.post.current_user_reaction;

    if (likeAction.canToggle && isBlank(likeAction.can_undo)) {
      title = "discourse_reactions.main_reaction.add";
    }

    if (likeAction.canToggle && likeAction.can_undo) {
      title = "discourse_reactions.main_reaction.remove";
    }

    if (!likeAction.canToggle) {
      title = "discourse_reactions.main_reaction.cant_remove";
    }

    if (
      currentUserReaction &&
      currentUserReaction.can_undo &&
      isBlank(likeAction.can_undo)
    ) {
      title = "discourse_reactions.picker.remove_reaction";
      options = { reaction: currentUserReaction.id };
    }

    if (
      currentUserReaction &&
      !currentUserReaction.can_undo &&
      isBlank(likeAction.can_undo)
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
        {
          title: this.buildAttributes(attrs).title
        },
        [iconNode(mainReactionIcon)]
      );
    }

    if (currentUserReaction) {
      return h(
        "button.btn-icon.no-text.reaction-button",
        {
          title: this.buildAttributes(attrs).title
        },
        h("img.btn-toggle-reaction-emoji.reaction-button", {
          src: emojiUrlFor(currentUserReaction.id),
          alt: `:${currentUserReaction.id}:`
        })
      );
    }

    return h(
      "button.btn-toggle-reaction-like.btn-icon.no-text.reaction-button",
      {
        title: this.buildAttributes(attrs).title
      },
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
    this.callWidgetFunction("collapseStatePanel");
  }
});
