import Component from "@glimmer/component";
import { action } from "@ember/object";
import { service } from "@ember/service";
import { and, not } from "truth-helpers";
import concatClass from "discourse/helpers/concat-class";
import CustomReaction from "../../models/discourse-reactions-custom-reaction";
import Counter from "./counter";
import DoubleButton from "./double-button";
import ReactionButton from "./reaction-button";

const VIBRATE_DURATION = 5;

export default class Actions extends Component {
  @service capabilities;
  @service currentUser;
  @service siteSettings;

  get leftPosition() {
    return this.args.position === "left";
  }

  get mainReaction() {
    return this.siteSettings.discourse_reactions_reaction_for_like;
  }

  get isMainReaction() {
    const { post } = this.args;

    return (
      post.reactions &&
      post.reactions.length === 1 &&
      post.reactions[0].id === this.mainReaction
    );
  }

  get classes() {
    const { post } = this.args;

    if (!post.reactions) {
      return;
    }

    const hasReactions = post.reactions.length;
    const hasReacted = post.current_user_reaction;
    const customReactionUsed =
      post.reactions.length &&
      post.reactions.filter(
        (reaction) =>
          reaction.id !==
          this.siteSettings.discourse_reactions_reaction_for_like
      ).length;
    const classes = [];

    if (customReactionUsed) {
      classes.push("custom-reaction-used");
    }

    if (post.yours) {
      classes.push("my-post");
    }

    if (hasReactions) {
      classes.push("has-reactions");
    }

    if (hasReacted) {
      classes.push("has-reacted");
    }

    if (post.current_user_used_main_reaction) {
      classes.push("has-used-main-reaction");
    }

    if (
      (!post.current_user_reaction || post.current_user_reaction.can_undo) &&
      post.likeAction?.canToggle
    ) {
      classes.push("can-toggle-reaction");
    }

    return classes;
  }

  @action
  toggleReaction(attrs) {
    // this.collapseAllPanels();

    if (
      this.args.post.current_user_reaction &&
      !this.args.post.current_user_reaction.can_undo &&
      !this.args.post.likeAction.canToggle
    ) {
      return;
    }

    const post = this.args.post;

    if (post.current_user_reaction) {
      post.reactions.every((reaction, index) => {
        if (
          reaction.count <= 1 &&
          reaction.id === post.current_user_reaction.id
        ) {
          post.reactions.splice(index, 1);
          return false;
        } else if (reaction.id === post.current_user_reaction.id) {
          post.reactions[index].count -= 1;

          return false;
        }

        return true;
      });
    }

    if (
      attrs.reaction &&
      (!post.current_user_reaction ||
        attrs.reaction !== post.current_user_reaction.id)
    ) {
      let isAvailable = false;

      post.reactions.every((reaction, index) => {
        if (reaction.id === attrs.reaction) {
          post.reactions[index].count += 1;
          isAvailable = true;
          return false;
        }
        return true;
      });

      if (!isAvailable) {
        const newReaction = {
          id: attrs.reaction,
          type: "emoji",
          count: 1,
        };

        const tempReactions = Object.assign([], post.reactions);

        tempReactions.push(newReaction);

        //sorts reactions and get index of new reaction
        const newReactionIndex = tempReactions
          .sort((reaction1, reaction2) => {
            if (reaction1.count > reaction2.count) {
              return -1;
            }
            if (reaction1.count < reaction2.count) {
              return 1;
            }

            //if count is same, sort it by id
            if (reaction1.id > reaction2.id) {
              return 1;
            }
            if (reaction1.id < reaction2.id) {
              return -1;
            }
          })
          .indexOf(newReaction);

        post.reactions.splice(newReactionIndex, 0, newReaction);
      }

      if (!post.current_user_reaction) {
        post.reaction_users_count += 1;
      }

      post.current_user_reaction = {
        id: attrs.reaction,
        type: "emoji",
        can_undo: true,
      };
    } else {
      post.reaction_users_count -= 1;
      post.current_user_reaction = null;
    }

    if (
      post.current_user_reaction &&
      post.current_user_reaction.id ===
        this.siteSettings.discourse_reactions_reaction_for_like
    ) {
      post.current_user_used_main_reaction = true;
    } else {
      post.current_user_used_main_reaction = false;
    }
  }

  @action
  toggle(attrs) {
    console.log("toggle", attrs);

    if (!this.currentUser) {
      if (this.args.showLogin) {
        this.args.showLogin();
        return;
      }
    }

    // this.collapseAllPanels();

    const mainReactionName =
      this.siteSettings.discourse_reactions_reaction_for_like;
    const post = this.args.post;
    const currentUserReaction = post.current_user_reaction;

    if (
      post.likeAction &&
      !(post.likeAction.canToggle || post.likeAction.can_undo)
    ) {
      console.log(1);
      return;
    }

    if (
      this.args.post.current_user_reaction &&
      !this.args.post.current_user_reaction.can_undo
    ) {
      console.log(2);
      return;
    }

    if (!this.currentUser || post.user_id === this.currentUser.id) {
      console.log(3);
      return;
    }

    if (this.capabilities.userHasBeenActive && this.capabilities.canVibrate) {
      console.log(4);
      navigator.vibrate(VIBRATE_DURATION);
    }

    if (currentUserReaction?.id === attrs.reaction) {
      console.log(5);
      this.toggleReaction(attrs);
      return CustomReaction.toggle(this.args.post, attrs.reaction).catch(
        (e) => {
          this.dialog.alert(this._extractErrors(e));
          this._rollbackState(post);
        }
      );
    }

    let selector;
    if (
      post.reactions &&
      post.reactions.length === 1 &&
      post.reactions[0].id === mainReactionName
    ) {
      selector = `[data-post-id="${this.args.post.id}"] .discourse-reactions-double-button .discourse-reactions-reaction-button .d-icon`;
    } else {
      if (!attrs.reaction || attrs.reaction === mainReactionName) {
        selector = `[data-post-id="${this.args.post.id}"] .discourse-reactions-reaction-button .d-icon`;
      } else {
        selector = `[data-post-id="${this.args.post.id}"] .discourse-reactions-reaction-button .reaction-button .btn-toggle-reaction-emoji`;
      }
    }

    const mainReaction = document.querySelector(selector);

    const scales = [1.0, 1.5];
    return new Promise((resolve) => {
      // scaleReactionAnimation(mainReaction, scales[0], scales[1], () => {
      // scaleReactionAnimation(mainReaction, scales[1], scales[0], () => {
      this.toggleReaction(attrs);

      let toggleReaction =
        attrs.reaction && attrs.reaction !== mainReactionName
          ? attrs.reaction
          : this.siteSettings.discourse_reactions_reaction_for_like;

      CustomReaction.toggle(this.args.post, toggleReaction)
        .then(resolve)
        .catch((e) => {
          this.dialog.alert(this._extractErrors(e));
          this._rollbackState(post);
        });
      // });
      // });
    });
  }

  <template>
    <div class={{concatClass "discourse-reactions-actions" this.classes}}>
      {{#if this.leftPosition}}
        <Counter @post={{@post}} />
      {{else}}
        {{#if this.isMainReaction}}
          <DoubleButton @post={{@post}} @toggle={{this.toggle}} />
        {{else if this.site.mobileView}}
          {{#if (not @post.yours)}}
            <Counter @post={{@post}} />
            <ReactionButton @post={{@post}} @toggle={{this.toggle}} />
          {{else if (and @post.yours @post.reactions.length)}}
            <Counter @post={{@post}} />
          {{/if}}
        {{else}}
          {{#if (not @post.yours)}}
            <ReactionButton @post={{@post}} @toggle={{this.toggle}} />
          {{/if}}
        {{/if}}
      {{/if}}
    </div>
  </template>
}
