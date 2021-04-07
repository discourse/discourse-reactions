import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { default as ReactionsTopics } from "../fixtures/reactions-topic-fixtues";

acceptance("Display reaction button", {
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

test(
  "It displays reaction-button when post is not yours",
  async assert => {
    await visit("/t/-/topic_with_reactions_and_likes");

    assert.ok(
      exists('[id="post_2"] .discourse-reactions-reaction-button'),
      "Has reaction-button"
    );
  }
);

test(
  "Doesn't displays reaction-button when post is yours",
  async assert => {
    await visit("/t/-/topic_with_reactions_and_likes");

    assert.notOk(
      exists('[id="post_1"] .discourse-reactions-reaction-button'),
      "Does not has reaction-button"
    );
  }
);
