import Component from "@glimmer/component";
import { concat } from "@ember/helper";
import { get } from "@ember/object";
import concatClass from "discourse/helpers/concat-class";
import StatePanelReaction from "./state-panel-reaction";

export default class StatePanel extends Component {
  get maxLength() {
    const maxCount = Math.max(...this.args.post.reactions.mapBy("count"));
    return maxCount.toString().length;
  }

  <template>
    <div
      class={{concatClass
        "discourse-reactions-state-panel"
        (concat "max-length-" this.maxLength)
      }}
      ...attributes
    >
      <div class="container">
        {{#if @reactionsUsers}}
          {{#each @post.reactions as |reaction|}}
            <StatePanelReaction
              @post={{@post}}
              @users={{get @reactionsUsers reaction.id}}
              @reaction={{reaction}}
            />
          {{/each}}
        {{else}}
          <div class="spinner small"></div>
        {{/if}}
      </div>
    </div>
  </template>
}
