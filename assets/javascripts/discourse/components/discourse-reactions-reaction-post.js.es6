import Component from "@ember/component";
import discourseComputed from "discourse-common/utils/decorators";
import getURL from "discourse-common/lib/get-url";
import { propertyEqual } from "discourse/lib/computed";
import { emojiUrlFor } from "discourse/lib/text";

export default Component.extend({
  classNameBindings: [":user-stream-item", ":item", "moderatorAction"],

  @discourseComputed("post.url")
  postUrl(url) {
    return getURL(url);
  },

  @discourseComputed("post.current_user_reaction.id")
  emojiUrl(currentUserReaction) {
    if (!currentUserReaction) {
      return;
    }
    return emojiUrlFor(currentUserReaction);
  },

  didReceiveAttrs() {
    this._super(...arguments);

    this.set(
      "currentUser.avatar_template",
      this.post.current_user_reaction.avatar_template
    );
  },

  moderatorAction: propertyEqual(
    "post.post_type",
    "site.post_types.moderator_action"
  )
});
