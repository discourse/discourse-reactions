import DiscourseReactionsAdapter from "./discourse-reactions-adapter";

export default DiscourseReactionsAdapter.extend({
  pathFor(store, type, findArgs) {
    const path =
      this.basePath(store, type, findArgs) +
      store.pluralize(this.apiNameFor(type));
    return this.appendQueryParams(path, findArgs);
  },

  apiNameFor() {
    return "custom-reaction";
  },
});
