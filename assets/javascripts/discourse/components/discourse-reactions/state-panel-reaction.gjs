import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { concat, fn, hash } from "@ember/helper";
import { action } from "@ember/object";
import DButton from "discourse/components/d-button";
import avatar from "discourse/helpers/bound-avatar-template";
import concatClass from "discourse/helpers/concat-class";
import replaceEmoji from "discourse/helpers/replace-emoji";
import { i18n } from "discourse-i18n";

const MAX_USERS_COUNT = 26;
const MIN_USERS_COUNT = 3;

export default class StatePanel extends Component {
  @tracked showMoreUsers = false;

  get maxLength() {
    const maxCount = Math.max(...this.args.post.reactions.mapBy("count"));
    return maxCount.toString().length;
  }

  get firstLineUsers() {
    return this.args.users?.slice(0, MIN_USERS_COUNT);
  }

  get restOfUsers() {
    return this.args.users?.slice(MIN_USERS_COUNT, MAX_USERS_COUNT);
  }

  get canShowMoreUsers() {
    return this.args.users?.length > MIN_USERS_COUNT;
  }

  get columnsCount() {
    return this.args.users?.length > MIN_USERS_COUNT
      ? this.firstLineUsers?.length + 1
      : this.firstLineUsers?.length;
  }

  get moreLabel() {
    if (this.args.users?.length <= MAX_USERS_COUNT) {
      return;
    }

    return i18n("discourse_reactions.state_panel.more_users", {
      count: this.args.reaction.count - MAX_USERS_COUNT,
    });
  }

  @action
  toggleShowMoreUsers() {
    this.showMoreUsers = !this.showMoreUsers;
  }

  <template>
    <div class={{concatClass "discourse-reactions-state-panel-reaction"}}>

      <div class="reaction-wrapper">
        <div class="emoji-wrapper">
          {{replaceEmoji (concat ":" @reaction.id ":")}}
        </div>
        <div class="count">{{@reaction.count}}</div>

        <div class="users">
          <div
            class={{concatClass
              "list"
              (concat "list-columns-" this.columnsCount)
            }}
          >
            {{#each this.firstLineUsers as |user|}}
              {{avatar user.avatar_template "tiny" (hash title=user.username)}}
            {{/each}}

            {{#if this.canShowMoreUsers}}
              <DButton
                class="show-users"
                @icon={{if this.showMoreUsers "chevron-up" "chevron-down"}}
                @action={{fn this.toggleShowMoreUsers}}
              />
            {{/if}}

            {{#if this.showMoreUsers}}
              {{#each this.restOfUsers as |user|}}
                {{avatar
                  user.avatar_template
                  "tiny"
                  (hash title=user.username)
                }}
              {{/each}}
            {{/if}}
          </div>

          {{this.moreLabel}}
        </div>
      </div>
    </div>
  </template>
}
