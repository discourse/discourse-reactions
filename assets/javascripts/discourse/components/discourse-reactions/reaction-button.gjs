import Component from "@glimmer/component";
import { concat } from "@ember/helper";
import { action } from "@ember/object";
import { service } from "@ember/service";
import { isBlank } from "@ember/utils";
import DButton from "discourse/components/d-button";
import replaceEmoji from "discourse/helpers/replace-emoji";
import { i18n } from "discourse-i18n";

export default class ReactionButton extends Component {
  @service currentUser;
  @service siteSettings;
  @service capabilities;
  @service site;

  get mainReactionIcon() {
    return this.siteSettings.discourse_reactions_like_icon;
  }

  get hasUsedMainReaction() {
    return this.args.post.current_user_used_main_reaction;
  }

  get currentUserReaction() {
    return this.args.post.current_user_reaction;
  }

  get title() {
    if (!this.currentUser) {
      return {
        title: i18n("discourse_reactions.main_reaction.unauthenticated"),
      };
    }

    const likeAction = this.args.post.likeAction;
    if (!likeAction) {
      return {};
    }

    let title;
    let options;

    if (likeAction.canToggle && isBlank(likeAction.can_undo)) {
      title = "discourse_reactions.main_reaction.add";
    } else if (likeAction.canToggle && likeAction.can_undo) {
      title = "discourse_reactions.main_reaction.remove";
    } else if (!likeAction.canToggle) {
      title = "discourse_reactions.main_reaction.cant_remove";
    } else if (
      this.currentUserReaction?.can_undo &&
      isBlank(likeAction.can_undo)
    ) {
      title = "discourse_reactions.picker.remove_reaction";
      options = { reaction: this.currentUserReaction.id };
    } else if (
      !this.currentUserReaction?.can_undo &&
      isBlank(likeAction.can_undo)
    ) {
      title = "discourse_reactions.picker.cant_remove_reaction";
    }

    return options ? i18n(title, options) : i18n(title);
  }

  @action
  toggleReaction() {
    // this.callWidgetFunction("cancelCollapse");

    const currentUserReaction = this.args.post.current_user_reaction;
    if (!this.capabilities.touch || !this.site.mobileView) {
      this.args.toggle({
        reaction: currentUserReaction
          ? currentUserReaction.id
          : this.siteSettings.discourse_reactions_reaction_for_like,
      });
    }
  }

  <template>
    <div class="discourse-reactions-reaction-button">
      {{#if this.hasUsedMainReaction}}
        <DButton
          class="btn-toggle-reaction reaction-button"
          title={{this.title}}
          @icon={{this.mainReactionIcon}}
          @action={{this.toggleReaction}}
        />
      {{else if this.currentUserReaction}}
        <DButton
          class="reaction-button"
          title={{this.title}}
          @action={{this.toggleReaction}}
        >
          {{replaceEmoji (concat ":" this.currentUserReaction.id ":")}}
        </DButton>
      {{else}}
        <DButton
          class="btn-toggle-reaction reaction-button"
          title={{this.title}}
          @icon={{concat "far-" this.mainReactionIcon}}
          @action={{this.toggleReaction}}
        />
      {{/if}}
    </div>
  </template>
}
