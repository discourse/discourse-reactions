import Component from "@ember/component";
import I18n from "I18n";
import { isEmpty } from "@ember/utils";
import { on } from "discourse-common/utils/decorators";
import { emojiUrlFor } from "discourse/lib/text";
import { set, action } from "@ember/object";
import { later } from "@ember/runloop";

export default Component.extend({
  classNameBindings: [":value-list"],
  inputDelimiter: null,
  collection: [],
  values: null,
  validationMessage: null,
  emojiPickerIsActive: false,
  isEditorFocused: false,

  @action
  emojiSelected(code) {
    this.set("emojiName", code);
    this.set("emojiPickerIsActive", !this.emojiPickerIsActive);
    this.set("isEditorFocused", !this.isEditorFocused);
  },

  @action
  openEmojiPicker() {
    this.set("isEditorFocused", !this.isEditorFocused);
    later(() => {
      this.set("emojiPickerIsActive", !this.emojiPickerIsActive);
    }, 100);
  },

  @action
  clearInput() {
    this.set("emojiName", "");
  },

  @on("didReceiveAttrs")
  _setupCollection() {
    let object;
    const values = this.values;
    const defaultValue = values
      .split("|")
      .find(
        element => element === this.siteSettings.discourse_reactions_like_icon
      );

    if (!defaultValue) {
      object = {
        value: this.siteSettings.discourse_reactions_like_icon,
        emojiUrl: emojiUrlFor(this.siteSettings.discourse_reactions_like_icon),
        isLast: false,
        isEditable: false,
        isEditing: false
      };
    }

    const collectionValues = this._splitValues(values);

    if (object) {
      collectionValues.unshift(object);
    }

    this.set("collection", collectionValues);
  },

  _splitValues(values) {
    if (values && values.length) {
      const keys = ["value", "emojiUrl", "isLast"];
      const res = [];
      const emojis = values.split("|");
      emojis.forEach((str, index) => {
        const object = {};
        object.value = str;

        if (str === this.siteSettings.discourse_reactions_like_icon) {
          object.emojiUrl = emojiUrlFor(
            this.siteSettings.discourse_reactions_like_icon
          );
          object.isEditable = false;
        } else {
          object.emojiUrl = emojiUrlFor(str);
          object.isEditable = true;
        }

        object.isEditing = false;

        object.isLast = emojis.length - 1 === index;

        res.push(object);
      });

      return res;
    } else {
      return [];
    }
  },

  @action
  editValue(index) {
    const item = this.collection[index];
    if (item.isEditable) {
      set(item, "isEditing", !item.isEditing);
      later(() => {
        const textbox = document.querySelector(
          `[data-index="${index}"] .value-input`
        );
        if (textbox) {
          textbox.focus();
        }
      }, 100);
    }
  },

  actions: {
    changeValue(index, newValue) {
      const item = this.collection[index];

      if (this._checkInvalidInput(newValue)) {
        const oldValues = this.setting.value.split("|");

        if (
          oldValues.includes(this.siteSettings.discourse_reactions_like_icon)
        ) {
          set(item, "value", oldValues[index]);
        } else {
          set(item, "value", oldValues[index - 1]);
        }
        set(item, "isEditing", !item.isEditing);

        return;
      }

      this._replaceValue(index, newValue);

      set(item, "isEditing", !item.isEditing);
    },

    addValue() {
      if (this._checkInvalidInput([this.emojiName])) {
        return;
      }
      this._addValue(this.emojiName);
      this.set("emojiName", "");
    },

    removeValue(value) {
      this._removeValue(value);
    },

    shiftUp(index) {
      if (!index) {
        return;
      }
      const temp = this.collection[index];
      this.collection[index] = this.collection[index - 1];
      this.collection[index - 1] = temp;
      this._saveValues();
    },

    shiftDown(index) {
      if (!this.collection[index + 1]) {
        return;
      }
      const temp = this.collection[index];
      this.collection[index] = this.collection[index + 1];
      this.collection[index + 1] = temp;
      this._saveValues();
    }
  },

  _checkInvalidInput(input) {
    this.set("validationMessage", null);

    if (isEmpty(input) || input.includes("|") || !emojiUrlFor(input)) {
      this.set(
        "validationMessage",
        I18n.t("admin.site_settings.emoji_list.invalid_input")
      );
      return true;
    }

    return false;
  },

  _addValue(value) {
    const object = {
      value: value,
      emojiUrl: emojiUrlFor(value),
      isLast: true,
      isEditable: true,
      isEditing: false
    };
    this.collection.addObject(object);
    this._saveValues();
  },

  _removeValue(value) {
    const collection = this.collection;
    collection.removeObject(value);
    this._saveValues();
  },

  _replaceValue(index, newValue) {
    const item = this.collection[index];
    if (item.value === newValue) {
      return;
    }
    set(item, "value", newValue);
    this._saveValues();
  },

  _saveValues() {
    this.set(
      "values",
      this.collection
        .map(function(elem) {
          return elem.value;
        })
        .join("|")
    );
  }
});
