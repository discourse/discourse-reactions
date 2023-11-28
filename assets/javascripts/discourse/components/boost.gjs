import Component from "@glimmer/component";
import { tinyAvatar } from "discourse-common/lib/avatar-utils";
import { htmlSafe } from "@ember/template";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import DMenu from "float-kit/components/d-menu";

export default class Boost extends Component {
  <template>
    <li data-boost-id={{@boost.id}} class="boost">
      <div class="clickable" data-user-card={{@boost.user.username}}>
        {{this.userAvatar}}
      </div>

      <DMenu>
        <:trigger>
          {{this.cooked}}
        </:trigger>
        <:content>
          close
        </:content>
      </DMenu>
    </li>
  </template>

  @service("discourse-boosts-api") api;

  get userAvatar() {
    console.log(this.args.boost.user);
    return htmlSafe(tinyAvatar(this.args.boost.user.avatar_template));
  }

  get cooked() {
    return htmlSafe(this.args.boost.cooked);
  }

  @action
  async showActions() {
    await this.api.deleteBoost(this.args.boost.id);
  }
}
