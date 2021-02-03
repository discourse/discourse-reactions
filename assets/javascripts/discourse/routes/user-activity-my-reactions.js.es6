import DiscourseRoute from "discourse/routes/discourse";
import CustomReaction from "../models/discourse-reactions-custom-reaction";

export default DiscourseRoute.extend({
  userActionType: 17,
  noContentHelpKey: "discourse_assigns.no_reactions",

  model() {
    return CustomReaction.findMyReactions(
      this.modelFor("user").username_lower
    );
  },

  setupController(controller, model) {
    let loadedAll = model.length < 20;
    this.controllerFor("user-activity-my-reactions").setProperties({
      model,
      canLoadMore: !loadedAll
    });
    this.controllerFor("application").set("showFooter", loadedAll);
  },

  renderTemplate() {
    this.render("user-activity-my-reactions");
  }
});
