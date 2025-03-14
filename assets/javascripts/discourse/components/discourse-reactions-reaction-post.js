import Component from "@glimmer/component";
import { equal } from "@ember/object/computed";
import { service } from "@ember/service";
import getURL from "discourse/lib/get-url";
import { emojiUrlFor } from "discourse/lib/text";

export default class DiscourseReactionsReactionPost extends Component {
  @service site;
  @service siteSettings;

  @equal("args.reaction.post.post_type", "site.post_types.moderator_action")
  moderatorAction;

  get expandedExcerpt() {
    if (!this.args.reaction.post.expandedExcerpt) {
      return;
    }

    return this.displayUsernameOrNameMentionExcerpt(
      this.args.reaction.post.expandedExcerpt
    );
  }

  get excerpt() {
    return this.displayUsernameOrNameMentionExcerpt(
      this.args.reaction.post.excerpt
    );
  }

  displayUsernameOrNameMentionExcerpt(excerpt) {
    const name = this.args.reaction.user.name;
    const username = this.args.reaction.user.username;
    if (this.siteSettings.prioritize_full_name_in_ux || !username) {
      return excerpt.replace(/@\p{L}+/u, `@${name || username}`);
    } else {
      excerpt;
    }
  }

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
