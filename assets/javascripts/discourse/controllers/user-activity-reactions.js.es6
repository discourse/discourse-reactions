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
    if (!this.canLoadMore) {
      return;
    }
    if (this.loading) {
      return;
    }
    this.set("loading", true);
    const posts = this.model;
    if (posts && posts.length) {
      const beforePostId = posts[posts.length - 1].get("current_user_reaction").id;

      const opts = { beforePostId };

      CustomReaction.findYourReactions(this.currentUser.username_lower, opts)
        .then((newPosts) => {
          posts.addObjects(newPosts);
          if (newPosts.length === 0) {
            this.set("canLoadMore", false);
          }
        })
        .finally(() => {
          this.set("loading", false);
        });
    }
  },

  @observes("canLoadMore")
  _showFooter() {
    this.set("application.showFooter", !this.canLoadMore);
  },
});