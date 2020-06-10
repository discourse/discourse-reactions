import { h } from "virtual-dom";
import I18n from "I18n";
import { cancel, later, next } from "@ember/runloop";
import { createWidget } from "discourse/widgets/widget";

export default createWidget("discourse-reactions-actions", {
  tagName: "div.discourse-reactions-actions",

  buildKey: attrs => `discourse-reactions-actions-${attrs.post.id}`,

  buildClasses(attrs) {
    if (attrs.post.liked) {
      return "is-liked";
    }
  },

  toggleReactions(event) {
    if (this.state.reactionsPickerExpanded) {
      this.scheduleCollapseReactionsPicker(event, true);
    } else {
      this.expandReactionsPicker(event);
    }
  },

  toggleStatePanel(event) {
    if (this.state.statePanelExpanded) {
      this.scheduleCollapseStatePanel(event, true);
    } else {
      this.expandStatePanel(event);
    }
  },

  toggleReaction(params) {
    bootbox.alert(`TOGGLE ${params.reaction}`);
  },

  toggleLike() {
    if (this.state.reactionsPickerExpanded) {
      this.collapseReactionsPicker();
    } else if (this.state.statePanelExpanded) {
      this.collapseStatePanel();
    } else {
      bootbox.alert("TOGGLE LIKE");
    }
  },

  buildId: attrs => `discourse-reactions-actions-${attrs.post.id}`,

  clickOutside(event) {
    if (this.state.reactionsPickerExpanded) {
      this.collapseReactionsPicker(event, true);
    }

    if (this.state.statePanelExpanded) {
      this.collapseStatePanel(event, true);
    }
  },

  expandReactionsPicker() {
    this._laterCollapseStatePanel && cancel(this._laterCollapseStatePanel);
    this.state.statePanelExpanded = false;
    this.state.reactionsPickerExpanded = true;
    this.scheduleRerender();
    this._setupPopper(this.attrs.post.id, "_popperPicker", [
      (".btn-reaction", ".discourse-reactions-picker")
    ]);
  },

  expandStatePanel() {
    this._laterCollapsePicker && cancel(this._laterCollapsePicker);
    this.state.reactionsPickerExpanded = false;
    this.state.statePanelExpanded = true;
    this.scheduleRerender();
    this._setupPopper(this.attrs.post.id, "_popperStatePanel", [
      ".discourse-reactions-counter",
      ".discourse-reactions-state-panel"
    ]);
  },

  scheduleCollapseStatePanel(event, force = false) {
    if (this.mobileView) {
      this.collapseStatePanel(event, force);
    } else {
      this._laterCollapseStatePanel && cancel(this._laterCollapseStatePanel);

      this._laterCollapseStatePanel = later(
        this,
        this.collapseStatePanel,
        event,
        force,
        250
      );
    }
  },

  collapseStatePanel(event, force = false) {
    const container = document.getElementById(this.buildId(this.attrs));
    const panelContainer = container.querySelector(
      ".discourse-reactions-state-panel"
    );

    if (
      force ||
      !this._isCursorInsideContainers([container, panelContainer], event)
    ) {
      this.state.statePanelExpanded = false;

      next(() => {
        const panel = document.querySelector(
          `#discourse-reactions-actions-${this.attrs.post.id} .discourse-reactions-state-panel`
        );

        panel.classList.remove("is-expanded");
      });
    }
  },

  scheduleCollapseReactionsPicker(event, force = false) {
    if (this.site.mobileView) {
      this.collapseReactionsPicker(event, force);
    } else {
      this._laterCollapsePicker && cancel(this._laterCollapsePicker);

      this._laterCollapsePicker = later(
        this,
        this.collapseReactionsPicker,
        event,
        force,
        250
      );
    }
  },

  collapseReactionsPicker(event, force = false) {
    const container = document.getElementById(this.buildId(this.attrs));
    const pickerContainer = container.querySelector(
      ".discourse-reactions-picker"
    );

    if (
      force ||
      !this._isCursorInsideContainers([container, pickerContainer], event)
    ) {
      this.state.reactionsPickerExpanded = false;

      next(() => {
        const picker = document.querySelector(
          `#discourse-reactions-actions-${this.attrs.post.id} .discourse-reactions-picker`
        );

        picker.classList.remove("is-expanded");
      });
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
      .map(container =>
        this._isCursorInsideContainer(event, container.getBoundingClientRect())
      )
      .includes(true);
  },

  _isCursorInsideContainer(event, bounds) {
    // slight inset to prevent false positives
    return (
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom
    );
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
