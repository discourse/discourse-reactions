import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { concat } from "@ember/helper";
import { on } from "@ember/modifier";
import { action } from "@ember/object";
import didInsert from "@ember/render-modifiers/modifiers/did-insert";
import { service } from "@ember/service";
import { autoUpdate, computePosition } from "@floating-ui/dom";
import { modifier } from "ember-modifier";
import replaceEmoji from "discourse/helpers/replace-emoji";
import { i18n } from "discourse-i18n";

const DISPLAY_MAX_USERS = 19;

export default class ReactionsListEmoji extends Component {
  @service siteSettings;

  @tracked isShowingUsersList = false;
  @tracked usersListTrigger = null;

  positionUsersList = modifier((element) => {
    const cleanup = autoUpdate(this.usersListTrigger, element, async () => {
      const { x, y } = await computePosition(this.usersListTrigger, element);

      Object.assign(element.style, {
        left: `${x}px`,
        top: `${y}px`,
        position: "absolute",
      });
    });

    return () => {
      cleanup();
    };
  });

  get displayedUsers() {
    return this.args.users.slice(0, DISPLAY_MAX_USERS);
  }

  get showMore() {
    return this.args.reaction.count > DISPLAY_MAX_USERS;
  }

  get showMoreLabel() {
    return i18n("discourse_reactions.state_panel.more_users", {
      count: this.args.reaction.count - DISPLAY_MAX_USERS,
    });
  }

  normalizeReactionName(reactionId) {
    return reactionId.replace(/_/g, " ");
  }

  displayedUsername(user) {
    if (this.siteSettings.prioritize_username_in_ux) {
      return user.username;
    } else if (!user.name) {
      return user.username;
    } else {
      return user.name;
    }
  }

  @action
  showUsersList() {
    this.args.onShowReactionList(this.args.reaction);
    this.isShowingUsersList = true;
  }

  @action
  closeUsersList() {
    this.isShowingUsersList = false;
  }

  @action
  registerUsersListTrigger(element) {
    this.usersListTrigger = element;
  }

  <template>
    <div
      class="discourse-reactions-list-emoji"
      {{on "mouseenter" this.showUsersList}}
      {{on "mouseleave" this.closeUsersList}}
      {{didInsert this.registerUsersListTrigger}}
      role="button"
    >
      {{replaceEmoji
        (concat ":" @reaction.id ":")
        class=(if
          this.siteSettings.discourse_reactions_desaturated_reaction_panel
          "desaturated"
        )
      }}
    </div>

    {{#if this.isShowingUsersList}}
      <div class="user-list" {{this.positionUsersList}}>
        <div class="container">
          <span class="heading">{{this.normalizeReactionName
              @reaction.id
            }}</span>
          {{#if @users}}
            {{#each this.displayedUsers as |user|}}
              <span class="username">
                {{this.displayedUsername user.username}}
              </span>
            {{/each}}

            {{#if this.showMore}}
              <span class="other-users">{{this.showMoreLabel}}</span>
            {{/if}}
          {{else}}
            <div class="spinner small"></div>
          {{/if}}
        </div>
      </div>
    {{/if}}
  </template>
}
