import Component from "@glimmer/component";
import { hash } from "@ember/helper";
import { on } from "@ember/modifier";
import { action } from "@ember/object";
import { service } from "@ember/service";
import { TrackedObject } from "@ember-compat/tracked-built-ins";
import { and, not } from "truth-helpers";
import { h } from "virtual-dom";
import icon from "discourse/helpers/d-icon";
import { iconNode } from "discourse/lib/icon-library";
import closeOnClickOutside from "discourse/modifiers/close-on-click-outside";
import { createWidget } from "discourse/widgets/widget";
import CustomReaction from "../models/discourse-reactions-custom-reaction";

export default class DiscourseReactionsCounter extends Component {
  @service capabilities;
  @service site;
  @service siteSettings;

  state = new TrackedObject(this.defaultState());

  get elementId() {
    return `discourse-reactions-counter-${this.args.post.id}-${
      this.args.position || "right"
    }`;
  }

  reactionsChanged(data) {
    data.reactions.uniq().forEach((reaction) => {
      this.getUsers(reaction);
    });
  }

  defaultState() {
    return {
      reactionsUsers: {},
      statePanelExpanded: false,
    };
  }

  getUsers(reactionValue) {
    return CustomReaction.findReactionUsers(this.args.post.id, {
      reactionValue,
    }).then((response) => {
      response.reaction_users.forEach((reactionUser) => {
        this.state.reactionsUsers[reactionUser.id] = reactionUser.users;
      });

      this.args.updatePopperPosition();
    });
  }

  @action
  mouseDown(event) {
    event.stopImmediatePropagation();
    return false;
  }

  @action
  mouseUp(event) {
    event.stopImmediatePropagation();
    return false;
  }

  @action
  click(event) {
    this.args.cancelCollapse();

    if (!this.capabilities.touch || !this.site.mobileView) {
      event.stopPropagation();
      event.preventDefault();

      if (!this.args.statePanelExpanded) {
        this.getUsers();
      }

      this.toggleStatePanel(event);
    }
  }

  @action
  clickOutside() {
    if (this.args.statePanelExpanded) {
      this.args.collapseAllPanels();
    }
  }

  @action
  touchStart(event) {
    this.args.cancelCollapse();

    if (
      event.target.classList.contains("show-users") ||
      event.target.classList.contains("avatar")
    ) {
      return true;
    }

    if (this.args.statePanelExpanded) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    if (this.capabilities.touch) {
      event.stopPropagation();
      event.preventDefault();
      this.getUsers();
      this.toggleStatePanel(event);
    }
  }

  get classes() {
    const classes = [];
    const mainReaction =
      this.siteSettings.discourse_reactions_reaction_for_like;

    const { post } = this.args;

    if (
      post.reactions &&
      post.reactions.length === 1 &&
      post.reactions[0].id === mainReaction
    ) {
      classes.push("only-like");
    }

    if (post.reaction_users_count > 0) {
      classes.push("discourse-reactions-counter");
    }

    return classes;
  }

  toggleStatePanel() {
    if (!this.args.statePanelExpanded) {
      this.args.expandStatePanel();
    } else {
      this.args.collapseStatePanel();
    }
  }

  @action
  pointerOver(event) {
    if (event.pointerType !== "mouse") {
      return;
    }

    this.args.cancelCollapse();
  }

  @action
  pointerOut(event) {
    if (event.pointerType !== "mouse") {
      return;
    }

    if (!event.relatedTarget?.closest(`#${this.elementId}`)) {
      this.args.scheduleCollapse("collapseStatePanel");
    }
  }

  // html(attrs) {
  //   if (attrs.post.reaction_users_count) {
  //     const post = attrs.post;
  //     const count = post.reaction_users_count;
  //     if (count <= 0) {
  //       return;
  //     }

  //     const mainReaction =
  //       this.siteSettings.discourse_reactions_reaction_for_like;
  //     const mainReactionIcon = this.siteSettings.discourse_reactions_like_icon;
  //     const items = [];

  //     items.push(
  //       this.attach(
  //         "discourse-reactions-state-panel",
  //         Object.assign({}, attrs, {
  //           reactionsUsers: this.state.reactionsUsers,
  //         })
  //       )
  //     );

  //     if (
  //       !(post.reactions.length === 1 && post.reactions[0].id === mainReaction)
  //     ) {
  //       items.push(
  //         this.attach("discourse-reactions-list", {
  //           reactionsUsers: this.state.reactionsUsers,
  //           post: attrs.post,
  //         })
  //       );
  //     }

  //     items.push(h("span.reactions-counter", count.toString()));

  //     if (
  //       post.yours &&
  //       post.reactions &&
  //       post.reactions.length === 1 &&
  //       post.reactions[0].id === mainReaction
  //     ) {
  //       items.push(
  //         h(
  //           "div.discourse-reactions-reaction-button.my-likes",
  //           h(
  //             "button.btn-toggle-reaction-like.btn-icon.no-text.reaction-button",
  //             [iconNode(`${mainReactionIcon}`)]
  //           )
  //         )
  //       );
  //     }

  //     return items;
  //   }
  // }

  get onlyOneMainReaction() {
    return (
      this.args.post.reactions?.length === 1 &&
      this.args.post.reactions[0].id ===
        this.siteSettings.discourse_reactions_reaction_for_like
    );
  }

  <template>
    <div
      id={{this.elementId}}
      class={{this.classes}}
      {{on "mousedown" this.mouseDown}}
      {{on "mouseup" this.mouseUp}}
      {{on "click" this.click}}
      {{closeOnClickOutside this.clickOutside (hash)}}
      {{on "touchstart" this.touchStart}}
      {{on "pointerover" this.pointerOver}}
      {{on "pointerout" this.pointerOut}}
    >
      {{#if @post.reaction_users_count}}
        {{! reactions-state-panel }}

        {{#if (not this.onlyOneMainReaction)}}
          {{! reactions-list }}
        {{/if}}

        <span class="reactions-counter">
          {{@post.reaction_users_count}}
        </span>

        {{#if (and @post.yours this.onlyOneMainReaction)}}
          <div class="discourse-reactions-reaction-button my-likes">
            <button
              class="btn-toggle-reaction-like btn-icon no-text reaction-button"
            >
              {{icon this.siteSettings.discourse_reactions_like_icon}}
            </button>
          </div>
        {{/if}}
      {{/if}}
    </div>
  </template>
}
