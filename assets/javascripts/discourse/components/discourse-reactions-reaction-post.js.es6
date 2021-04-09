import Component from "@ember/component";
import discourseComputed from "discourse-common/utils/decorators";
import getURL from "discourse-common/lib/get-url";
import { propertyEqual } from "discourse/lib/computed";
import { emojiUrlFor } from "discourse/lib/text";

export default Component.extend({
  classNameBindings: [":user-stream-item", ":item", "moderatorAction"],

  @discourseComputed("reaction.post.url")
  postUrl(url) {
    return getURL(url);
  },

  @discourseComputed("reaction.reaction.reaction_value")
  emojiUrl(reactionValue) {
    if (!reactionValue) {
      return;
    }
    return emojiUrlFor(reactionValue);
  },

  moderatorAction: propertyEqual(
    "reaction.post.post_type",
    "site.post_types.moderator_action"
  ),
});
