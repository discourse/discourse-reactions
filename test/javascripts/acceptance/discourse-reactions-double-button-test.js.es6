import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { default as ReactionsTopics } from "../fixtures/reactions-topic-fixtues";

acceptance("Discourse reactions double button", {
  loggedIn: true,
  settings: {
    discourse_reactions_enabled: true,
    discourse_reactions_enabled_reactions: "otter|open_mouth",
    discourse_reactions_reaction_for_like: "heart",
    discourse_reactions_like_icon: "heart"
  },

  pretend(server, helper) {
    const topicPath = "/t/topic_with_reactions_and_likes.json";
    server.get(topicPath, () => helper.response(ReactionsTopics[topicPath]));
  }
});

QUnit.test("It displays double-button when only likes on post", async (assert) => {
  await visit("/t/-/topic_with_reactions_and_likes");

  assert.ok(exists('[id="post_3"] .discourse-reactions-double-button'), "Has double button");
});

QUnit.test("Doesn't displays double-button when likes and reactions both are present", async (assert) => {
  await visit("/t/-/topic_with_reactions_and_likes");

  assert.notOk(exists('[id="post_1"] .discourse-reactions-double-button'), "does not has double button");
});
