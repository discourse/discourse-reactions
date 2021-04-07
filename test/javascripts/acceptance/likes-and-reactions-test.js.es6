import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { default as ReactionsTopics } from "../fixtures/reactions-topic-fixtues";

acceptance("Likes and Reactions", {
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

QUnit.test("Displays correct reactions count", async assert => {
  await visit("/t/-/topic_with_reactions_and_likes");

  assert.equal(
    find(
      '[id="post_1"] .discourse-reactions-counter .reactions-counter'
    ).text(),
    209
  );
});

QUnit.test(
  "Reactions list contains reactions sorted by count",
  async assert => {
    await visit("/t/-/topic_with_reactions_and_likes");
    const expectedSequence =
      "heartangrylaughingopen_mouthcrythumbsdownnose:t2thumbsup";

    const reactions = find(
      '[id="post_1"] .discourse-reactions-counter .discourse-reactions-list .reactions .reaction'
    ).text();
    assert.equal(reactions, expectedSequence);
  }
);
