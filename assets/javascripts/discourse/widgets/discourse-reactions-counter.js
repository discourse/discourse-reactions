import { h } from "virtual-dom";
import { iconNode } from "discourse/lib/icon-library";
import { createWidget } from "discourse/widgets/widget";
import CustomReaction from "../models/discourse-reactions-custom-reaction";

export default createWidget("discourse-reactions-counter", {
  tagName: "div",

  buildKey: (attrs) =>
    `discourse-reactions-counter-${attrs.post.id}-${attrs.position || "right"}`,

  buildId: (attrs) =>
    `discourse-reactions-counter-${attrs.post.id}-${attrs.position || "right"}`,

  reactionsChanged(data) {
    data.reactions.uniq().forEach((reaction) => {
      this.getUsers(reaction);
    });
  },

  defaultState() {
    return {
      reactionsUsers: {},
      statePanelExpanded: false,
    };
  },

  getUsers(reactionValue) {
    return CustomReaction.findReactionUsers(this.attrs.post.id, {
      reactionValue,
    }).then((response) => {
      response.reaction_users.forEach((reactionUser) => {
        this.state.reactionsUsers[reactionUser.id] = reactionUser.users;
      });

      this.scheduleRerender();
      this.callWidgetFunction("updatePopperPosition");
    });
  },

  mouseDown(event) {
    event.stopImmediatePropagation();
    return false;
  },

  mouseUp(event) {
    event.stopImmediatePropagation();
    return false;
  },

  click(event) {
    this.callWidgetFunction("cancelCollapse");

    if (!this.capabilities.touch || !this.site.mobileView) {
      event.stopPropagation();
      event.preventDefault();

      if (!this.attrs.statePanelExpanded) {
        this.getUsers();
      }

      this.toggleStatePanel(event);
    }
  },

  clickOutside() {
    if (this.attrs.statePanelExpanded) {
      this.callWidgetFunction("collapseAllPanels");
    }
  },

  touchStart(event) {
    this.callWidgetFunction("cancelCollapse");

    if (
      event.target.classList.contains("show-users") ||
      event.target.classList.contains("avatar")
    ) {
      return true;
    }

    if (this.attrs.statePanelExpanded) {
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
  },

  buildClasses(attrs) {
    const classes = [];
    const mainReaction =
      this.siteSettings.discourse_reactions_reaction_for_like;

    if (
      attrs.post.reactions &&
      attrs.post.reactions.length === 1 &&
      attrs.post.reactions[0].id === mainReaction
    ) {
      classes.push("only-like");
    }

    if (attrs.post.reaction_users_count > 0) {
      classes.push("discourse-reactions-counter");
    }

    return classes;
  },

  html(attrs) {
    if (attrs.post.reaction_users_count) {
      const post = attrs.post;
      const count = post.reaction_users_count;
      if (count <= 0) {
        return;
      }

      const mainReaction =
        this.siteSettings.discourse_reactions_reaction_for_like;
      const mainReactionIcon = this.siteSettings.discourse_reactions_like_icon;
      const items = [];

      items.push(
        this.attach(
          "discourse-reactions-state-panel",
          Object.assign({}, attrs, {
            reactionsUsers: this.state.reactionsUsers,
          })
        )
      );

      if (
        !(post.reactions.length === 1 && post.reactions[0].id === mainReaction)
      ) {
        items.push(
          this.attach("discourse-reactions-list", {
            reactionsUsers: this.state.reactionsUsers,
            post: attrs.post,
          })
        );
      }

      items.push(h("span.reactions-counter", count.toString()));

      if (
        post.yours &&
        post.reactions &&
        post.reactions.length === 1 &&
        post.reactions[0].id === mainReaction
      ) {
        items.push(
          h(
            "div.discourse-reactions-reaction-button.my-likes",
            h(
              "button.btn-toggle-reaction-like.btn-icon.no-text.reaction-button",
              [iconNode(`${mainReactionIcon}`)]
            )
          )
        );
      }

      return items;
    }
  },

  toggleStatePanel() {
    if (!this.attrs.statePanelExpanded) {
      this.callWidgetFunction("expandStatePanel");
    } else {
      this.callWidgetFunction("collapseStatePanel");
    }
  },

  mouseOver() {
    this.callWidgetFunction("cancelCollapse");
  },

  mouseOut(event) {
    if (!event.relatedTarget?.closest(`#${this.buildId(this.attrs)}`)) {
      this.callWidgetFunction("scheduleCollapse", "collapseStatePanel");
    }
  },
});
