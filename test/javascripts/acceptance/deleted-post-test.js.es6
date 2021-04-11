import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { default as ReactionsTopics } from "../fixtures/reactions-topic-fixtues";

acceptance("Deleted post reactions", {
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

test("Deleted posts doesn't shows reaction controls", async (assert) => {
  await visit("/t/-/topic_with_reactions_and_likes");

  assert.notOk(
    exists('#post_4 .discourse-reactions-actions'),
    "reaction controls are not available"
  );
});
