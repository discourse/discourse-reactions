import DiscourseRoute from "discourse/routes/discourse";
import CustomReaction from "../models/discourse-reactions-custom-reaction";

export default DiscourseRoute.extend({
  model() {
    return CustomReaction.findReactions(
      "reactions-received",
      this.modelFor("user").get("username")
    );
  },

  setupController(controller, model) {
    let loadedAll = model.length < 20;
    this.controllerFor("user-activity-reactions").setProperties({
      model,
      canLoadMore: !loadedAll,
      reactionsUrl: "reactions-received",
      username: this.modelFor("user").get("username"),
    });
    this.controllerFor("application").set("showFooter", loadedAll);
  },

  renderTemplate() {
    this.render("user-activity-reactions");
  },
});
