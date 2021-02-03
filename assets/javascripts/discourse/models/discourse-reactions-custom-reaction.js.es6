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

  findMyReactions(name, opts) {
    opts = opts || {};

    if (!name) {
      return;
    }

    const data = {};

    if (opts.beforePostId) {
      data.before_post_id = opts.beforePostId;
    }

    return ajax(`/discourse-reactions/posts/reactions-given/${name}.json`, {
      data
    }).then(posts => {
      return posts.map(p => {
        p.user = User.create(p.user);
        p.topic = Topic.create(p.topic);
        p.category = Category.findById(p.category_id);
        return EmberObject.create(p);
      });
    });
  }
});

export default CustomReaction;
