import { ajax } from "discourse/lib/ajax";
import RestModel from "discourse/models/rest";
import Topic from "discourse/models/topic";
import User from "discourse/models/user";
import Category from "discourse/models/category";
import EmberObject from "@ember/object";

const CustomReaction = RestModel.extend({
  init() {
    this._super(...arguments);

    this.__type = "discourse-reactions-custom-reaction";
  }
});

CustomReaction.reopenClass({
  toggle(postId, reactionId) {
    return ajax(
      `/discourse-reactions/posts/${postId}/custom-reactions/${reactionId}/toggle.json`,
      { type: "PUT" }
    );
  },

  findReactions(url, opts) {
    opts = opts || {};

    const data = {};

    if (opts.beforeReactionUserId) {
      data.before_reaction_user_id = opts.beforeReactionUserId;
    }

    return ajax(`/discourse-reactions/posts/${url}.json`, {
      data
    }).then(reactions => {
      return reactions.map(reaction => {
        reaction.user = User.create(reaction.user);
        reaction.topic = Topic.create(reaction.post.topic);
        reaction.post_user = User.create(reaction.post.user);
        reaction.category = Category.findById(reaction.post.category_id);
        return EmberObject.create(reaction);
      });
    });
  }
});

export default CustomReaction;
