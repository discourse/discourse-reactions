import Controller, { inject as controller } from "@ember/controller";
import { observes } from "discourse-common/utils/decorators";
import { action } from "@ember/object";
import CustomReaction from "../models/discourse-reactions-custom-reaction";

export default Controller.extend({
  canLoadMore: true,
  loading: false,
  application: controller(),
  beforeLikeId: null,
  beforeReactionUserId: null,

  _getLastIdFrom(array) {
    return array.length ? array[array.length - 1].get("id") : null;
  },

  _updateBeforeIds(reactionUsers) {
    if (this.includeLikes) {
      const mainReaction =
        this.siteSettings.discourse_reactions_reaction_for_like;
      const [likes, reactions] = reactionUsers.reduce(
        (memo, elem) => {
          if (elem.reaction.reaction_value === mainReaction) {
            memo[0].push(elem);
          } else {
            memo[1].push(elem);
          }

          return memo;
        },
        [[], []]
      );

      this.beforeLikeId = this._getLastIdFrom(likes);
      this.beforeReactionUserId = this._getLastIdFrom(reactions);
    } else {
      this.beforeReactionUserId = this._getLastIdFrom(reactionUsers);
    }
  },

  @action
  loadMore() {
    if (!this.canLoadMore || this.loading || !this.reactionsUrl) {
      return;
    }

    this.set("loading", true);
    const reactionUsers = this.model;

    if (!this.beforeReactionUserId) {
      this._updateBeforeIds(reactionUsers);
    }

    const opts = {
      actingUsername: this.actingUsername,
      includeLikes: this.includeLikes,
      beforeLikeId: this.beforeLikeId,
      beforeReactionUserId: this.beforeReactionUserId,
    };

    CustomReaction.findReactions(this.reactionsUrl, this.username, opts)
      .then((newReactionUsers) => {
        reactionUsers.addObjects(newReactionUsers);
        this._updateBeforeIds(newReactionUsers);
        if (newReactionUsers.length === 0) {
          this.set("canLoadMore", false);
        }
      })
      .finally(() => {
        this.set("loading", false);
      });
  },

  @observes("canLoadMore")
  _showFooter() {
    this.set("application.showFooter", !this.canLoadMore);
  },
});
