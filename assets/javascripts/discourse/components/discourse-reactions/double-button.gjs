import Component from "@glimmer/component";
import { gt, not } from "truth-helpers";
import Counter from "./counter";
import ReactionButton from "./reaction-button";

export default class DoubleButton extends Component {
  get count() {
    return this.args.post.reaction_users_count;
  }

  <template>
    <div class="discourse-reactions-double-button">
      {{#if (gt this.count 0)}}
        <Counter @post={{@post}} />
      {{/if}}

      {{#if (not @post.yours)}}
        <ReactionButton @post={{@post}} @toggle={{@toggle}} />
      {{/if}}
    </div>
  </template>
}
