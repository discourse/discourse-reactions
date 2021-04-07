import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { default as ReactionsTopics } from "../fixtures/reactions-topic-fixtues";

acceptance("Reactions disabled", {
  loggedIn: true,
  settings: {
    discourse_reactions_enabled: false
  },

  pretend(server, helper) {
    const topicPath = "/t/topic_with_reactions_and_likes.json";
    server.get(topicPath, () => helper.response(ReactionsTopics[topicPath]));
  }
});

QUnit.test("Doesn't displays reaction-actions", async assert => {
  await visit("/t/-/topic_with_reactions_and_likes");

  assert.notOk(
    exists(".discourse-reactions-actions"),
    "Does not have reaction-actions"
  );
});
