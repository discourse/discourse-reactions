import Component from "@glimmer/component";
import { hash } from "@ember/helper";
import MountWidget from "discourse/components/mount-widget";

export default class ReactionsActionSummary extends Component {
  static extraControls = true;

  static shouldRender(args, context, owner) {
    const site = owner.lookup("service:site");

    if (site.mobileView || args.post.deleted) {
      return false;
    }

    const siteSettings = owner.lookup("service:site-settings");
    const mainReaction = siteSettings.discourse_reactions_reaction_for_like;

    return !(
      args.post.reactions &&
      args.post.reactions.length === 1 &&
      args.post.reactions[0].id === mainReaction
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
