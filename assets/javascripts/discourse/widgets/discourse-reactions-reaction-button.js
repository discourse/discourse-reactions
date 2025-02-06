import { isBlank } from "@ember/utils";
import { h } from "virtual-dom";
import { iconNode } from "discourse/lib/icon-library";
import { emojiUrlFor } from "discourse/lib/text";
import { createWidget } from "discourse/widgets/widget";
import { i18n } from "discourse-i18n";

export default createWidget("discourse-reactions-reaction-button", {
  tagName: "div.discourse-reactions-reaction-button",

  buildKey: (attrs) => `discourse-reactions-reaction-button-${attrs.post.id}`,

  click() {
    this.callWidgetFunction("cancelCollapse");

    const currentUserReaction = this.attrs.post.current_user_reaction;
    if (!this.capabilities.touch || !this.site.mobileView) {
      this.callWidgetFunction("toggleFromButton", {
        reaction: currentUserReaction
          ? currentUserReaction.id
          : this.siteSettings.discourse_reactions_reaction_for_like,
      });
    }
  },

  mouseOver(event) {
    this.callWidgetFunction("cancelCollapse");

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
      this.callWidgetFunction("toggleReactions", event);
    }
  },

  mouseOut() {
    this.callWidgetFunction("cancelExpand");

    if (!window.matchMedia("(hover: none)").matches) {
      this.callWidgetFunction("scheduleCollapse", "collapseReactionsPicker");
    }
  },

  buildAttributes(attrs) {
    if (!this.currentUser) {
      return {
        title: i18n("discourse_reactions.main_reaction.unauthenticated"),
      };
    }

    const likeAction = attrs.post.likeAction;
    if (!likeAction) {
      return {};
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

    return options ? { title: i18n(title, options) } : { title: i18n(title) };
  },

  html(attrs) {
    const mainReactionIcon = this.siteSettings.discourse_reactions_like_icon;
    const hasUsedMainReaction = attrs.post.current_user_used_main_reaction;
    const currentUserReaction = attrs.post.current_user_reaction;

    if (hasUsedMainReaction) {
      return h(
        "button.btn-toggle-reaction-like.btn-icon.no-text.reaction-button",
        {
          title: this.buildAttributes(attrs).title,
        },
        [iconNode(mainReactionIcon)]
      );
    }

    if (currentUserReaction) {
      return h(
        "button.btn-icon.no-text.reaction-button",
        {
          title: this.buildAttributes(attrs).title,
        },
        h("img.btn-toggle-reaction-emoji.reaction-button", {
          src: emojiUrlFor(currentUserReaction.id),
          alt: `:${currentUserReaction.id}:`,
        })
      );
    }

    return h(
      "button.btn-toggle-reaction-like.btn-icon.no-text.reaction-button",
      {
        title: this.buildAttributes(attrs).title,
      },
      [iconNode(`far-${mainReactionIcon}`)]
    );
  },
});
