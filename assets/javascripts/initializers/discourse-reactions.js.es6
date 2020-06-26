import { withPluginApi } from "discourse/lib/plugin-api";
import { replaceIcon } from "discourse-common/lib/icon-library";

replaceIcon("notification.reaction", "bell");

function canHaveReactions(post, siteSettings) {
  return (
    post &&
    post.topic_id &&
    post.topic_id.toString() === siteSettings.discourse_reactions_test_topic_id
  );
}

function initializeDiscourseReactions(api) {
  const siteSettings = api.container.lookup("site-settings:main");

  api.decorateWidget("post-menu:before-extra-controls", dec => {
    const post = dec.getModel();

    if (!canHaveReactions(post, siteSettings)) {
      return;
    }

    return dec.attach("discourse-reactions-actions", {
      post
    });
  });

  api.decorateWidget("post-menu:before", dec => {
    const post = dec.getModel();

    if (!canHaveReactions(post, siteSettings)) {
      return;
    }

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
