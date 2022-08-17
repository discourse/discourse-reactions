import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { default as ReactionsTopics } from "../fixtures/reactions-topic-fixtures";

acceptance("Discourse Reactions - Disabled", function (needs) {
  needs.user();

  needs.settings({
    discourse_reactions_enabled: false,
  });

  needs.pretender((server, helper) => {
    const topicPath = "/t/topic_with_reactions_and_likes.json";
    server.get(topicPath, () => helper.response(ReactionsTopics[topicPath]));
  });

  test("Does not show reactions controls", async (assert) => {
    await visit("/t/-/topic_with_reactions_and_likes");

    assert.notOk(
      exists(".discourse-reactions-actions"),
      "reactions controls are not shown"
    );
  });
});
