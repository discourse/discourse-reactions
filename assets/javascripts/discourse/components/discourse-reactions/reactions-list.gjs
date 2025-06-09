import Component from "@glimmer/component";
import { fn } from "@ember/helper";
import { get } from "@ember/object";
import ReactionsListEmoji from "./reactions-list-emoji";

export default class ReactionsList extends Component {
  get count() {
    return this.args.post.reaction_users_count;
  }

  <template>
    <div class="discourse-reactions-list" ...attributes>
      <div class="reactions">
        {{#each @post.reactions as |reaction|}}
          {{log @reactionsUsers}}
          <ReactionsListEmoji
            @reaction={{reaction}}
            @post={{@post}}
            @onShowReactionList={{fn @onClick reaction}}
            @reactionUsers={{get @reactionsUsers reaction.id}}
          />
        {{/each}}
      </div>
    </div>
  </template>
}
