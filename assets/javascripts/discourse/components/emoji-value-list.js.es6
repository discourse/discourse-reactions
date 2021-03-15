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

  @on("didReceiveAttrs")
  _setupCollection() {
    let object;
    const values = this.values;
    let defaultValue = values
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

    let collectionValues = this._splitValues(values);

    if (object) {
      collectionValues.unshift(object);
    }

    this.set("collection", collectionValues);
  },

  _splitValues(values) {
    if (values && values.length) {
      const keys = ["value", "emojiUrl", "isLast"];
      let res = [];
      let emojis = values.split("|");
      emojis.forEach((str, index) => {
        let object = {};
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
    let item = this.collection[index];
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
      let item = this.collection[index];
      if (this._checkInvalidInput(newValue)) {
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
      let temp = this.collection[index];
      this.collection[index] = this.collection[index - 1];
      this.collection[index - 1] = temp;
      this._saveValues();
    },

    shiftDown(index) {
      if (!this.collection[index + 1]) {
        return;
      }
      let temp = this.collection[index];
      this.collection[index] = this.collection[index + 1];
      this.collection[index + 1] = temp;
      this._saveValues();
    }
  },

  _checkInvalidInput(inputs) {
    this.set("validationMessage", null);
    for (let input of inputs) {
      if (isEmpty(input) || input.includes("|")) {
        this.set(
          "validationMessage",
          I18n.t("admin.site_settings.secret_list.invalid_input")
        );
        return true;
      }
    }
  },

  _addValue(value) {
    let object = {
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
    let item = this.collection[index];
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
