import Controller, { inject as controller } from "@ember/controller";
import { observes } from "discourse-common/utils/decorators";
import { action } from "@ember/object";
import CustomReaction from "../models/discourse-reactions-custom-reaction";

export default Controller.extend({
  emptyText: "discourse_reactions.empty_reactions_post_list",
  canLoadMore: true,
  loading: false,
  application: controller(),

  @action
  loadMore() {
    if (!this.canLoadMore || this.loading || !this.reactionsUrl) {
      return;
    }

    this.set("loading", true);
    const posts = this.model;

    const beforeReactionUserId = posts.length
      ? posts[posts.length - 1].get("id")
      : null;

    const opts = { beforeReactionUserId };

    CustomReaction.findReactions(this.reactionsUrl, opts)
      .then(newPosts => {
        posts.addObjects(newPosts);
        if (newPosts.length === 0) {
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
  }
});
