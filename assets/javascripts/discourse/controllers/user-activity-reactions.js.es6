import Controller, { inject as controller } from "@ember/controller";
import { observes } from "discourse-common/utils/decorators";
import { action } from "@ember/object";
import CustomReaction from "../models/discourse-reactions-custom-reaction";

export default Controller.extend({
  canLoadMore: true,
  loading: false,
  application: controller(),

  @action
  loadMore() {
    if (!this.canLoadMore || this.loading || !this.reactionsUrl) {
      return;
    }

    this.set("loading", true);
    const reactionUsers = this.model;

    const beforeReactionUserId = reactionUsers.length
      ? reactionUsers[reactionUsers.length - 1].get("id")
      : null;

    const opts = {
      beforeReactionUserId,
      actingUsername: this.actingUsername,
    };

    CustomReaction.findReactions(this.reactionsUrl, this.username, opts)
      .then((newReactionUsers) => {
        reactionUsers.addObjects(newReactionUsers);
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
