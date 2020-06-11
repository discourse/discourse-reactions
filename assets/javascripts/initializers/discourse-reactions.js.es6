// import ComponentConnector from "discourse/widgets/component-connector";
import { withPluginApi } from "discourse/lib/plugin-api";

let cachedPostDiscourseReactions = {};

export function cachePostReactions(postId, reactions) {
  cachedPostDiscourseReactions[postId] = reactions;
}

export function fetchPostReactions(postId) {
  return cachedPostDiscourseReactions[postId];
}

export function resetPostReactions(postId) {
  if (postId) {
    delete cachedPostDiscourseReactions[postId];
  } else {
    cachedPostDiscourseReactions = {};
  }
}

function reactionForIcon(icon) {
  switch (icon) {
    case "heart":
      return "heart";
    case "star":
      return "star";
    case "thumbs-up":
      return "thumbsup";
    default:
      return "heart";
  }
}

function canHaveReactions(post, siteSettings) {
  return (
    post &&
    post.showLike &&
    post.topicId.toString() === siteSettings.discourse_reactions_test_topic_id
  );
}

function initializeDiscourseReactions(api) {
  const siteSettings = api.container.lookup("site-settings:main");
  const enabledReactions = [
    ...new Set(
      [reactionForIcon(siteSettings.discourse_reactions_like_icon)].concat(
        siteSettings.discourse_reactions_enabled_reactions
          .split("|")
          .filter(Boolean)
          .map(r => r.replace(/^\-/, ""))
      )
    )
  ];

  api.cleanupStream(resetPostReactions);

  api.includePostAttributes("reactions");

  api.decorateWidget("post-menu:before-extra-controls", dec => {
    if (!canHaveReactions(dec.attrs, siteSettings)) {
      return;
    }

    return dec.attach("discourse-reactions-actions", {
      post: dec.attrs,
      enabledReactions
    });
  });

  api.decorateWidget("post-menu:before", dec => {
    if (!canHaveReactions(dec.attrs, siteSettings)) {
      return;
    }

    return dec.attach("discourse-reactions-list", {
      post: dec.attrs
    });
  });
}

export default {
  name: "discourse-reactions",

  initialize(container) {
    const siteSettings = container.lookup("site-settings:main");
    if (siteSettings.discourse_reactions_enabled) {
      withPluginApi("0.10.1", initializeDiscourseReactions);
    }
  }
};
