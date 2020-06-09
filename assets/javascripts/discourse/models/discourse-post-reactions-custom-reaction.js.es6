import RestModel from "discourse/models/rest";

const Event = RestModel.extend({
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

export default Event;
