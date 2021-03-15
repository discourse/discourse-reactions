import Component from "@ember/component";
import I18n from "I18n";
import { isEmpty } from "@ember/utils";
import { on } from "discourse-common/utils/decorators";

export default Component.extend({
  classNameBindings: [":value-list", ":secret-value-list"],
  inputDelimiter: null,
  collection: [],
  values: null,
  validationMessage: null,

  @on("didReceiveAttrs")
  _setupCollection() {
    const values = this.values;

    if (values && values.length) {
      this.set(
        "collection",
        values.split("|")
      );
    } else {
      this.collection.push("mainReaction");
    }
  },

  actions: {
    changeValue(index, newValue) {
      if (this._checkInvalidInput(newValue)) {
        return;
      }
      this._replaceValue(index, newValue);
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
      if(!index) {
        return;
      }
      let temp = this.collection[index];
      this.collection[index] = this.collection[index - 1];
      this.collection[index - 1] = temp;
      this._saveValues();
    },

    shiftDown(index) {
      if(!this.collection[index + 1]) {
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
    this.collection.push(value);
    this._saveValues();
  },

  _removeValue(value) {
    const collection = this.collection;
    collection.removeObject(value);
    this._saveValues();
  },

  _replaceValue(index, newValue) {
    this.collection[index] = newValue;

    this._saveValues();
  },

  _saveValues() {
    this.set(
      "values",
      this.collection.join("|")
    );
  }
});
