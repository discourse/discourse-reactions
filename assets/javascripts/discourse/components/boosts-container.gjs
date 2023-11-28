import Component from "@glimmer/component";
import Boost from "discourse/plugins/discourse-reactions/discourse/components/boost";
import { inject as service } from "@ember/service";
import HorizontalOverflowNav from "discourse/components/horizontal-overflow-nav";

export default class BoostsContainer extends Component {
  <template>
    {{#if @post.boosts.length}}
      <HorizontalOverflowNav @class="boosts">
        {{#each @post.boosts as |boost|}}
          <Boost @boost={{boost}} />
        {{/each}}
      </HorizontalOverflowNav>
    {{/if}}
  </template>

  @service currentUser;
  @service messageBus;

  get shouldRenderExpandButton() {
    return this.scrollHeight > 0;
  }
}
