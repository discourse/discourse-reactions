import Component from "@glimmer/component";
import { hash } from "@ember/helper";
import { getOwner } from "@ember/owner";
import MountWidget from "discourse/components/mount-widget";

export default class ReactionsActionSummary extends Component {
  static shouldRender(post) {
    const site = getOwner(this).lookup("service:site");

    if (site.mobileView || post.deleted) {
      return false;
    }

    const siteSettings = getOwner(this).lookup("service:site-settings");
    const mainReaction = siteSettings.discourse_reactions_reaction_for_like;

    return !(
      post.reactions &&
      post.reactions.length === 1 &&
      post.reactions[0].id === mainReaction
    );
  }

  <template>
    {{#if @shouldRender}}
      <MountWidget
        @widget="discourse-reactions-actions"
        @args={{hash post=@post position="left"}}
      />
    {{/if}}
  </template>
}
