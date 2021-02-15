import DiscourseRoute from "discourse/routes/discourse";
import CustomReaction from "../models/discourse-reactions-custom-reaction";

export default DiscourseRoute.extend({
  model() {
    return CustomReaction.findReactions("my-reactions");
  },

  setupController(controller, model) {
    let loadedAll = model.length < 20;
    this.controllerFor("user-activity-my-reactions").setProperties({
      model,
      canLoadMore: !loadedAll,
      reactionsUrl: "my-reactions"
    });
    this.controllerFor("application").set("showFooter", loadedAll);
  },

  renderTemplate() {
    this.render("user-activity-my-reactions");
  }
});
