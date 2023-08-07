import Component from "@glimmer/component";
import { equal } from "@ember/object/computed";
import getURL from "discourse-common/lib/get-url";
import { emojiUrlFor } from "discourse/lib/text";
import { inject as service } from "@ember/service";

export default class DiscourseReactionsReactionPost extends Component {
  @service site;

  @equal("args.reaction.post.post_type", "site.post_types.moderator_action")
  moderatorAction;

  get postUrl() {
    return getURL(this.args.reaction.post.url);
  }

  get emojiUrl() {
    const reactionValue = this.args.reaction.reaction.reaction_value;

    if (!reactionValue) {
      return;
    }
    return emojiUrlFor(reactionValue);
  }
}
