import Component from "@glimmer/component";
import DButton from "discourse/components/d-button";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import DMenu from "float-kit/components/d-menu";
import { Input } from "@ember/component";
import { on } from "@ember/modifier";
import { fn } from "@ember/helper";

export default class AddBoostButton extends Component {
  <template>
    <DMenu @icon="rocket" @identifier="create-boost-dropdown" as |args|>
      <div class="create-boost-dropdown__content">
        <Input {{on "input" this.setRaw}} {{on "keydown" (fn this.handleEnter args)}} />
        <DButton @action={{fn this.createBoost args}} @translatedLabel="Save" />
      </div>
    </DMenu>
  </template>

  @service currentUser;
  @service modal;
  @service("discourse-boosts-api") api;
  @service siteSettings;

  get title() {
    return "disabled";
  }

  get disabled() {
    return (
      this.args.post.boosts?.length >=
      this.siteSettings.discourse_reactions_boosts_per_post
    );
  }

  @action
  setRaw(event) {
    this.raw = event.target.value;
  }

  @action
  async createBoost(args) {
    await this.api.createBoost({
      userId: this.currentUser.id,
      postId: this.args.post.id,
      raw: this.raw,
    });

    await args.close()
  }

  @action
  async handleEnter(args, event) {
    if (event.key === "Enter") {
      await this.createBoost(args);
    }
  }
}
