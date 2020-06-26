import { Promise } from "rsvp";
import { h } from "virtual-dom";
import I18n from "I18n";
import { next, run } from "@ember/runloop";
import { createWidget } from "discourse/widgets/widget";
import CustomReaction from "../models/discourse-reactions-custom-reaction";
import { isTesting } from "discourse-common/config/environment";
import { later, cancel } from "@ember/runloop";

function animateReaction(mainReaction, start, end, complete) {
  if (isTesting()) {
    return run(this, complete);
  }

  return $(mainReaction)
    .stop()
    .css("textIndent", start)
    .animate(
      { textIndent: end },
      {
        complete,
        step(now) {
          $(this).css("transform", `scale(${now})`);
        },
        duration: 150
      },
      "linear"
    );
}

export default createWidget("discourse-reactions-actions", {
  tagName: "div.discourse-reactions-actions",

  defaultState() {
    return {
      reactionsPickerExpanded: false,
      statePanelExpanded: false
    };
  },

  buildKey: attrs => `discourse-reactions-actions-${attrs.post.id}`,

  buildClasses(attrs) {
    const hasReactions = attrs.post.reactions.length > 0;
    const hasReacted = (attrs.post.reactions || []).reduce((acc, reaction) => {
      if (reaction.users.findBy("username", this.currentUser.username)) {
        acc += 1;
      }

      return acc;
    }, 0);
    const userHasReacted =
      hasReactions &&
      attrs.post.reactions.firstObject.users.findBy(
        "username",
        this.currentUser.username
      );

    const classes = [];
    if (hasReactions) classes.push("has-reactions");
    if (hasReacted > 0) classes.push("has-reacted");
    if (!hasReactions || (userHasReacted && userHasReacted.can_undo))
      classes.push("can-toggle");
    return classes;
  },

  toggleReactions(event) {
    if (this.state.reactionsPickerExpanded) {
      this.scheduleCollapse();
    } else {
      this.expandReactionsPicker(event);
    }
  },

  toggleStatePanel(event) {
    if (this.state.statePanelExpanded) {
      this.scheduleCollapse();
    } else {
      this.expandStatePanel(event);
    }
  },

  toggleReaction(params) {
    if (params.canUndo) {
      const reaction = document.querySelector(
        `[data-post-id="${params.postId}"] .discourse-reactions-picker .pickable-reaction.${params.reaction} .emoji`
      );
      const scales = [1.0, 1.5];
      return new Promise(resolve => {
        animateReaction(reaction, scales[0], scales[1], () => {
          animateReaction(reaction, scales[1], scales[0], () => {
            CustomReaction.toggle(params.postId, params.reaction)
              .then(resolve)
              .finally(() => this.collapsePanels());
          });
        });
      });
    }
  },

  toggleLike() {
    if (this.state.reactionsPickerExpanded) {
      this.collapsePanels();
    } else if (this.state.statePanelExpanded) {
      this.collapsePanels();
    } else {
      const mainReaction = document.querySelector(
        `[data-post-id="${this.attrs.post.id}"] .discourse-reactions-reaction-button .d-icon`
      );
      const scales = [1.0, 1.5];
      return new Promise(resolve => {
        animateReaction(mainReaction, scales[0], scales[1], () => {
          animateReaction(mainReaction, scales[1], scales[0], () => {
            CustomReaction.toggle(
              this.attrs.post.id,
              this.attrs.post.topic.valid_reactions.firstObject
            ).then(resolve);
          });
        });
      });
    }
  },

  cancelCollapse() {
    this._collapseHandler && cancel(this._collapseHandler);
  },

  scheduleCollapse() {
    this._collapseHandler && cancel(this._collapseHandler);
    this._collapseHandler = later(this, this.collapsePanels, 500);
  },

  buildId: attrs => `discourse-reactions-actions-${attrs.post.id}`,

  clickOutside() {
    this.collapsePanels();
  },

  expandReactionsPicker() {
    this.state.statePanelExpanded = false;
    this.state.reactionsPickerExpanded = true;
    this.scheduleRerender();
    this._setupPopper(this.attrs.post.id, "_popperPicker", [
      ".btn-toggle-reaction",
      ".discourse-reactions-picker"
    ]);
  },

  expandStatePanel() {
    this.state.reactionsPickerExpanded = false;
    this.state.statePanelExpanded = true;
    this.scheduleRerender();
    this._setupPopper(this.attrs.post.id, "_popperStatePanel", [
      ".discourse-reactions-counter",
      ".discourse-reactions-state-panel"
    ]);
  },

  collapsePanels() {
    this.cancelCollapse();

    this.state.statePanelExpanded = false;
    this.state.reactionsPickerExpanded = false;

    const container = document.getElementById(this.buildId(this.attrs));
    container &&
      container
        .querySelectorAll(
          ".discourse-reactions-state-panel.is-expanded, .discourse-reactions-reactions-picker.is-expanded"
        )
        .forEach(popper => popper.classList.remove("is-expanded"));

    this.scheduleRerender();
  },

  html(attrs) {
    const items = [];

    items.push(
      this.attach(
        "discourse-reactions-state-panel",
        Object.assign({}, attrs, {
          statePanelExpanded: this.state.statePanelExpanded
        })
      )
    );

    if (this.currentUser && attrs.post.user_id !== this.currentUser.id) {
      items.push(
        this.attach(
          "discourse-reactions-picker",
          Object.assign({}, attrs, {
            reactionsPickerExpanded: this.state.reactionsPickerExpanded
          })
        )
      );
    }

    let title;
    if (attrs.post.reactions.length) {
      title = I18n.t("discourse_reactions.has_react");
    } else {
      title = I18n.t("discourse_reactions.can_react");
    }

    items.push(
      h("div.double-button", { title }, [
        this.attach("discourse-reactions-counter", attrs),
        this.attach("discourse-reactions-reaction-button", attrs)
      ])
    );

    return items;
  },

  _setupPopper(postId, popperVariable, selectors) {
    next(() => {
      const trigger = document.querySelector(
        `#discourse-reactions-actions-${postId} ${selectors[0]}`
      );
      const popper = document.querySelector(
        `#discourse-reactions-actions-${postId} ${selectors[1]}`
      );

      popper.classList.add("is-expanded");

      if (this[popperVariable]) return;
      this[popperVariable] = this._applyPopper(trigger, popper);
    });
  },

  _applyPopper(button, picker) {
    // eslint-disable-next-line
    Popper.createPopper(button, picker, {
      placement: "top",
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, -5]
          }
        },
        {
          name: "preventOverflow",
          options: {
            padding: 5
          }
        }
      ]
    });
  }
});
