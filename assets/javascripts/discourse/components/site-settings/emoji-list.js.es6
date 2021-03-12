import Component from "@ember/component";
import { action } from "@ember/object";
import discourseComputed from "discourse-common/utils/decorators";

export default Component.extend({
  emojiPickerIsActive: false,
  // isEditorFocused: false,

  @action
  focusIn() {
    console.log('focusIn');
    // this.set("isEditorFocused", true);
    this.set("emojiPickerIsActive", true);
  },

  // @action
  // focusOut() {
  //   this.set("isEditorFocused", false);
  // },

  @action
  emojiSelected(code) {
    const textbox = this.element.querySelector("input.d-emoji-picker-imput");
    if(!this.get("value")) {
      this.set("value", code);
      return;
    }
    const emojis = this.get("value").split('|');
    emojis.push(code);
    this.set("value", emojis.join("|"));
  },
});
