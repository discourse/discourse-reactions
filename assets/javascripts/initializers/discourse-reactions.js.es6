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

function canHaveReactions(post, siteSettings) {
  return (
    post &&
    post.showLike &&
    post.topicId.toString() === siteSettings.discourse_reactions_test_topic_id
  );
}

function initializeDiscourseReactions(api) {
  const siteSettings = api.container.lookup("site-settings:main");
  api.cleanupStream(resetPostReactions);

  api.decorateWidget("post-menu:before-extra-controls", dec => {
    if (!canHaveReactions(dec.attrs, siteSettings)) {
      return;
    }

    const post = dec.getModel();

    return dec.attach("discourse-reactions-actions", {
      post
    });
  });

  api.decorateWidget("post-menu:before", dec => {
    if (!canHaveReactions(dec.attrs, siteSettings)) {
      return;
    }

    const post = dec.getModel();

    return dec.attach("discourse-reactions-list", {
      post
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
