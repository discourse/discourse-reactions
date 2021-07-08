import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { default as ReactionsTopics } from "../fixtures/reactions-topic-fixtues";

acceptance("Display reaction-count beside reaction-button", {
  loggedIn: true,
  settings: {
    discourse_reactions_enabled: true,
    discourse_reactions_enabled_reactions: "otter|open_mouth",
    discourse_reactions_reaction_for_like: "heart",
    discourse_reactions_like_icon: "heart",
  },

  pretend(server, helper) {
    const topicPath = "/t/topic_with_reactions_and_likes.json";
    server.get(topicPath, () => helper.response(ReactionsTopics[topicPath]));
  },
});

test("It displays reaction-count besides reaction button when there are only likes on post", async (assert) => {
  await visit("/t/-/topic_with_reactions_and_likes");

  assert.ok(
    exists('#post_3 .discourse-reactions-double-button'),
    "reaction-count is displayed beside reaction-button"
  );
});

test("doesn't display reaction-count besides reaction button when likes and reactions both are present", async (assert) => {
  await visit("/t/-/topic_with_reactions_and_likes");

  assert.notOk(
    exists('#post_1 .discourse-reactions-double-button'),
    "reaction-count is not displayed beside reaction-button"
  );
});
