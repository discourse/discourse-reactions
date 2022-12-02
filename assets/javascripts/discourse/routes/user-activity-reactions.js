import Route from "@ember/routing/route";
import CustomReaction from "../models/discourse-reactions-custom-reaction";

export default class UserActivityReactions extends Route {
  model() {
    return CustomReaction.findReactions(
      "reactions",
      this.modelFor("user").get("username")
    );
  }

  setupController(controller, model) {
    let loadedAll = model.length < 20;
    this.controllerFor("user-activity-reactions").setProperties({
      model,
      canLoadMore: !loadedAll,
      reactionsUrl: "reactions",
      username: this.modelFor("user").get("username"),
    });
    this.controllerFor("application").set("showFooter", loadedAll);
  }
}
