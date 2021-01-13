import { ajax } from "discourse/lib/ajax";
import RestModel from "discourse/models/rest";

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
    ).catch(e => {
      bootbox.alert(`${e.jqXHR.status} ${e.errorThrown}`);
    });
  }
});

export default CustomReaction;
