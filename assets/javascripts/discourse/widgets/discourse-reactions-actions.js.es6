import { h } from "virtual-dom";
import I18n from "I18n";
import { next } from "@ember/runloop";
import { createWidget } from "discourse/widgets/widget";
import CustomReaction from "../models/discourse-reactions-custom-reaction";

function offset(elt) {
  const rect = elt.getBoundingClientRect();
  const bodyElt = document.body;

  return {
    top: rect.top + bodyElt.scrollTop,
    left: rect.left + bodyElt.scrollLeft
  };
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
    if (attrs.post.liked) {
      return "is-liked";
    }
  },

  toggleReactions(event) {
    if (this.state.reactionsPickerExpanded) {
      this.collapseReactionsPicker(event);
    } else {
      this.expandReactionsPicker(event);
    }
  },

  toggleStatePanel(event) {
    if (this.state.statePanelExpanded) {
      this.collapseStatePanel(event);
    } else {
      this.expandStatePanel(event);
    }
  },

  toggleReaction(params) {
    if (params.canUndo) {
      CustomReaction.toggle(params.postId, params.reaction).finally(() =>
        this.collapseReactionsPicker()
      );
    }
  },

  toggleLike() {
    if (this.state.reactionsPickerExpanded) {
      this.collapseReactionsPicker();
    } else if (this.state.statePanelExpanded) {
      this.collapseStatePanel();
    } else {
      CustomReaction.toggle(
        this.attrs.post.id,
        this.attrs.post.topic.valid_reactions.firstObject
      );
    }
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

  collapseStatePanel(event) {
    const container = document.getElementById(this.buildId(this.attrs));
    const trigger = container.querySelector(".discourse-reactions-counter");
    const popper = container.querySelector(".discourse-reactions-state-panel");
    const fake = container.querySelector(".fake-zone");

    if (this.site.mobileView) {
      this.collapsePanels();
    } else if (
      !this._isCursorInsideContainers([trigger, popper, fake], event)
    ) {
      this.collapsePanels();
    }
  },

  collapseReactionsPicker(event) {
    const container = document.getElementById(this.buildId(this.attrs));
    const trigger = container.querySelector(".btn-toggle-reaction");
    const popper = container.querySelector(".discourse-reactions-picker");
    const fake = container.querySelector(".fake-zone");

    if (this.site.mobileView) {
      this.collapsePanels();
    } else if (
      !this._isCursorInsideContainers([trigger, popper, fake], event)
    ) {
      this.collapsePanels();
    }
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

    items.push(
      this.attach(
        "discourse-reactions-picker",
        Object.assign({}, attrs, {
          reactionsPickerExpanded: this.state.reactionsPickerExpanded
        })
      )
    );

    let title;
    // TODO should have a way to know if there's a reaction
    // and not just a like
    if (attrs.post.liked) {
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

  _isCursorInsideContainers(containers, event) {
    if (!event) return false;

    return containers
      .map(container => {
        if (!container) {
          return false;
        }
        return this._isCursorInsideContainer(event, container);
      })
      .includes(true);
  },

  _isCursorInsideContainer(event, container) {
    const bounds = container.getBoundingClientRect();
    const isCircle =
      window.getComputedStyle(container)["border-radius"] !== "0px";

    // we inset (-5/+5) so we do the check slightly before leaving container to make
    // it more reliable

    if (isCircle) {
      const distance = Math.floor(
        Math.sqrt(
          Math.pow(
            event.clientX -
              (offset(container).left + container.offsetWidth / 2),
            2
          ) +
            Math.pow(
              event.clientY -
                (offset(container).top + container.offsetHeight / 2),
              2
            )
        )
      );

      return container.offsetWidth / 2 - 5 > distance;
    } else {
      return (
        event.clientX >= bounds.left + 5 &&
        event.clientX <= bounds.right - 5 &&
        event.clientY >= bounds.top + 5 &&
        event.clientY <= bounds.bottom - 5
      );
    }
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
        }
      ]
    });
  }
});
