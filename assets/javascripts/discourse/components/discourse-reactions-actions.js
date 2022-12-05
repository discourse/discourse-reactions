import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { equal } from "@ember/object/computed";
import { emojiUrlFor } from "discourse/lib/text";
import { isBlank } from "@ember/utils";
import I18n from "I18n";
import { action } from "@ember/object";

export default class DiscourseReactionsActions extends Component {
  @service site;
  @service siteSettings;
  @service currentUser;
  @equal("args.position", "left") showCounter;
  mainReaction = this.siteSettings.discourse_reactions_reaction_for_like;
  mainReactionIcon = this.siteSettings.discourse_reactions_like_icon;
  currentUserReaction = this.args.post.current_user_reaction;

  get showPicker() {
    if (this.currentUser && this.args.post.user_id !== this.currentUser.id) {
      return true;
    }
    return false;
  }

  get reactionBtn() {
    const hasUsedMainReaction = this.args.post.current_user_used_main_reaction;

    if (hasUsedMainReaction) {
      return {
        title: this.#reactionBtnTitle(),
        icon: `far-${this.mainReactionIcon}`,
        classes: "btn-toggle-reaction-like reaction-button",
      };
    }

    if (this.currentUserReaction) {
      return {
        title: this.#reactionBtnTitle(),
        image: emojiUrlFor(this.currentUserReaction.id),
        imageAttrs: `:${this.currentUserReaction.id}:`,
        classes: "btn-icon no-text reaction-button ",
        image: {
          src: emojiUrlFor(this.currentUserReaction.id),
          attrs: `:${this.currentUserReaction.id}:`,
          classes: "btn-toggle-reaction-emoji reaction-button",
        },
      };
    }

    return {
      title: this.#reactionBtnTitle(),
      icon: `far-${this.mainReactionIcon}`,
      classes: "btn-toggle-reaction-like reaction-button",
    };
  }

  #reactionBtnTitle() {
    const likeAction = this.args.post.likeAction;
    if (!likeAction) {
      return "";
    }

    let title, options;

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
      this.currentUserReaction &&
      this.currentUserReaction.can_undo &&
      isBlank(likeAction.can_undo)
    ) {
      title = "discourse_reactions.picker.remove_reaction";
      options = { reaction: this.currentUserReaction.id };
    }

    if (
      this.currentUserReaction &&
      !this.currentUserReaction.can_undo &&
      isBlank(likeAction.can_undo)
    ) {
      title = "discourse_reactions.picker.cant_remove_reaction";
    }

    if (options) {
      return I18n.t(title, options);
    } else {
      return I18n.t(title);
    }
  }

  @action
  toggleReaction() {
    console.log("Reacted!");

    // TODO: toggle cancelCollapse is called

    if (this.args.capabilities.touch || this.site.mobileView) {
      // TODO: toggleFromButton() is called
    }
  }
}
