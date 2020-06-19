import EmberObject from "@ember/object";
import { ajax } from "discourse/lib/ajax";
import RestModel from "discourse/models/rest";

const CustomReaction = RestModel.extend({
  init() {
    this._super(...arguments);

    this.__type = "discourse-reactions-custom-reaction";
  },

  updateProperties() {
    const attributesKeys = Object.keys(ATTRIBUTES);
    return this.getProperties(attributesKeys);
  },

  createProperties() {
    const attributesKeys = Object.keys(ATTRIBUTES);
    return this.getProperties(attributesKeys);
  },

  _transformProps(props) {
    const attributesKeys = Object.keys(ATTRIBUTES);
    attributesKeys.forEach(key => {
      const attribute = ATTRIBUTES[key];
      if (attribute.transform) {
        props[key] = attribute.transform(props[key]);
      }
    });
  },

  beforeUpdate(props) {
    this._transformProps(props);
  },

  beforeCreate(props) {
    this._transformProps(props);
  }
});

CustomReaction.reopenClass({
  toggle(postId, reactionId) {
    return ajax(
      `/discourse-reactions/posts/${postId}/custom-reactions/${reactionId}/toggle.json`,
      { type: "PUT" }
    );
  }
});

export default CustomReaction;
