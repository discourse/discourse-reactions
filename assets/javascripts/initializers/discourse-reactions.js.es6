import { withPluginApi } from "discourse/lib/plugin-api";
import { replaceIcon } from "discourse-common/lib/icon-library";

replaceIcon("notification.reaction", "bell");

function initializeDiscourseReactions(api) {
  api.removePostMenuButton("like");

  api.addKeyboardShortcut("l", () => {
    const button = document.querySelector(
      ".topic-post.selected .discourse-reactions-reaction-button"
    );
    button && button.click();
  });

  api.decorateWidget("post-menu:before-extra-controls", dec => {
    const post = dec.getModel();

    if (!post) {
      return;
    }

    return dec.attach("discourse-reactions-actions", {
      post
    });
  });

  api.decorateWidget("post-menu:extra-post-controls", dec => {
    const post = dec.getModel();

    if(dec.widget.site.mobileView) {
      return;
    }

    if (!post) {
      return;
    }

    return dec.attach("discourse-reactions-counter", {
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
