import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { hash } from "@ember/helper";
import { on } from "@ember/modifier";
import { action } from "@ember/object";
import didInsert from "@ember/render-modifiers/modifiers/did-insert";
import { service } from "@ember/service";
import { TrackedObject } from "@ember-compat/tracked-built-ins";
import { autoUpdate, computePosition } from "@floating-ui/dom";
import { modifier } from "ember-modifier";
import DButton from "discourse/components/d-button";
import concatClass from "discourse/helpers/concat-class";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { headerOffset } from "discourse/lib/offset-calculator";
import closeOnClickOutside from "discourse/modifiers/close-on-click-outside";
import CustomReaction from "discourse/plugins/discourse-reactions/discourse/models/discourse-reactions-custom-reaction";
import ReactionsList from "./reactions-list";
import StatePanel from "./state-panel";

export default class Counter extends Component {
  @service siteSettings;

  @tracked isShowingStatePanel = false;
  @tracked statePanelTrigger = null;
  @tracked reactionsUsers = new TrackedObject();

  positionStatePanel = modifier(async (element) => {
    const update = async () => {
      const { x, y } = await computePosition(this.statePanelTrigger, element, {
        placement: "top",
        strategy: "absolute",
      });

      Object.assign(element.style, {
        left: `${x}px`,
        top: `${y}px`,
        position: "absolute",
      });
    };

    const cleanup = autoUpdate(this.statePanelTrigger, element, update);

    return () => {
      cleanup();
    };
  });

  get positiveCount() {
    return this.count > 0;
  }

  get count() {
    return this.args.post.reaction_users_count ?? 0;
  }

  get showToggleReactionButton() {
    const { post } = this.args;

    return post.yours && this.isMainReaction;
  }

  get mainReactionIcon() {
    return this.siteSettings.discourse_reactions_like_icon;
  }

  get mainReaction() {
    return this.siteSettings.discourse_reactions_reaction_for_like;
  }

  get isMainReaction() {
    const { post } = this.args;

    return (
      post.reactions &&
      post.reactions.length === 1 &&
      post.reactions[0].id === this.mainReaction
    );
  }

  get id() {
    return `discourse-reactions-counter-${this.args.post.id}-${
      this.args.position ?? "right"
    }`;
  }

  @action
  registerStatePanelTrigger(element) {
    this.statePanelTrigger = element;
  }

  @action
  showReactionsList(reaction) {
    this.loadUsers(reaction.id);
    this.isShowingStatePanel = !this.isShowingStatePanel;
  }

  @action
  showStatePanel() {
    this.loadUsers();
    this.isShowingStatePanel = !this.isShowingStatePanel;
  }

  @action
  closeStatePanel() {
    this.isShowingStatePanel = false;
  }

  @action
  async loadUsers(reactionValue) {
    if (this.isLoadingUsers) {
      return;
    }

    try {
      this.isLoadingUsers = true;

      const response = await CustomReaction.findReactionUsers(
        this.args.post.id,
        {
          reactionValue,
        }
      );

      response.reaction_users.forEach((reactionUser) => {
        this.reactionsUsers[reactionUser.id] = reactionUser.users;
      });

      console.log("LOADER", this.reactionsUsers);

      this.reactionsUsersLoaded = true;
    } catch (error) {
      popupAjaxError(error);
    } finally {
      this.isLoadingUsers = false;
    }
  }

  <template>
    {{#if this.positiveCount}}
      <div
        class={{concatClass
          (if this.isMainReaction "only-like")
          "discourse-reactions-counter"
          "btn-transparent"
        }}
      >
        {{log "reactionsUsers" this.reactionsUsers}}
        {{!-- <ReactionsList
          @post={{@post}}
          @onClick={{this.showReactionsList}}
          @reactionsUsers={{this.reactionsUsers}}

        /> --}}

        <span
          class="reactions-counter"
          {{didInsert this.registerStatePanelTrigger}}
          {{on "click" this.showStatePanel}}
        >{{this.count}}</span>

        {{#if this.isShowingStatePanel}}
          <StatePanel
            @post={{@post}}
            @reactionsUsers={{this.reactionsUsers}}
            {{this.positionStatePanel}}
            {{closeOnClickOutside
              this.closeStatePanel
              (hash targetSelector=".discourse-reactions-list-emoji")
            }}
          />
        {{/if}}
      </div>

      {{#if this.showToggleReactionButton}}
        <div class="discourse-reactions-reaction-button my-likes">
          <DButton
            class="btn-toggle-reaction-like reaction-button"
            @icon={{this.mainReactionIcon}}
          />
        </div>
      {{/if}}
    {{/if}}
  </template>
}
