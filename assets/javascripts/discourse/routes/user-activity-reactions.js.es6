import UserTopicListRoute from "discourse/routes/user-topic-list";

export default UserTopicListRoute.extend({
  userActionType: 17,
  noContentHelpKey: "discourse_assigns.no_reactions",

  model() {
    return;
  }
});