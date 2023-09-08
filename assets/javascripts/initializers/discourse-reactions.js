import { resetCurrentReaction } from "discourse/plugins/discourse-reactions/discourse/widgets/discourse-reactions-actions";
import { withPluginApi } from "discourse/lib/plugin-api";
import { replaceIcon } from "discourse-common/lib/icon-library";
import { emojiUrlFor } from "discourse/lib/text";
import { userPath } from "discourse/lib/url";
import { formatUsername } from "discourse/lib/utilities";
import I18n from "I18n";

const PLUGIN_ID = "discourse-reactions";

replaceIcon("notification.reaction", "bell");

function initializeDiscourseReactions(api) {
  if (api.replacePostMenuButton) {
    api.replacePostMenuButton("like", {
      name: "discourse-reactions-actions",
      buildAttrs: (widget) => {
        return { post: widget.findAncestorModel() };
      },
      shouldRender: (widget) => {
        const post = widget.findAncestorModel();
        return post && !post.deleted_at;
      },
    });
  } else {
    api.removePostMenuButton("like");
    api.decorateWidget("post-menu:before-extra-controls", (dec) => {
      const post = dec.getModel();
      if (!post || post.deleted_at) {
        return;
      }

      return dec.attach("discourse-reactions-actions", {
        post,
      });
    });
  }

  api.addKeyboardShortcut("l", null, {
    click: ".topic-post.selected .discourse-reactions-reaction-button",
  });

  api.modifyClass("component:scrolling-post-stream", {
    pluginId: PLUGIN_ID,

    didInsertElement() {
      this._super(...arguments);

      const topicId = this?.posts?.firstObject?.topic_id;
      if (topicId) {
        this.messageBus.subscribe(`/topic/${topicId}/reactions`, (data) => {
          this.dirtyKeys.keyDirty(
            `discourse-reactions-counter-${data.post_id}`,
            {
              onRefresh: "reactionsChanged",
              refreshArg: data,
            }
          );
          this._refresh({ id: data.post_id });
        });
      }
    },
  });

  api.modifyClass("controller:topic", {
    pluginId: PLUGIN_ID,

    unsubscribe() {
      this._super(...arguments);

      const topicId = this.model.id;
      topicId && this.messageBus.unsubscribe(`/topic/${topicId}/reactions`);
    },
  });

  api.decorateWidget("post-menu:extra-post-controls", (dec) => {
    if (dec.widget.site.mobileView) {
      return;
    }

    const mainReaction =
      dec.widget.siteSettings.discourse_reactions_reaction_for_like;
    const post = dec.getModel();

    if (!post || post.deleted_at) {
      return;
    }

    if (
      post.reactions &&
      post.reactions.length === 1 &&
      post.reactions[0].id === mainReaction
    ) {
      return;
    }

    return dec.attach("discourse-reactions-actions", {
      post,
      position: "left",
    });
  });

  api.modifyClass(
    "component:emoji-value-list",
    {
      pluginId: PLUGIN_ID,

      didReceiveAttrs() {
        this._super(...arguments);

        if (this.setting.setting !== "discourse_reactions_enabled_reactions") {
          return;
        }

        let defaultValue = this.values.includes(
          this.siteSettings.discourse_reactions_reaction_for_like
        );

        if (!defaultValue) {
          this.collection.unshiftObject({
            emojiUrl: emojiUrlFor(
              this.siteSettings.discourse_reactions_reaction_for_like
            ),
            isEditable: false,
            isEditing: false,
            value: this.siteSettings.discourse_reactions_reaction_for_like,
          });
        } else {
          const mainEmoji = this.collection.findBy(
            "value",
            this.siteSettings.discourse_reactions_reaction_for_like
          );

          if (mainEmoji) {
            mainEmoji.isEditable = false;
          }
        }
      },
    },
    // It's an admin component so it's not always present
    { ignoreMissing: true }
  );

  api.replaceIcon("notification.reaction", "discourse-emojis");

  if (api.registerNotificationTypeRenderer) {
    api.registerNotificationTypeRenderer("reaction", (NotificationTypeBase) => {
      return class extends NotificationTypeBase {
        get linkTitle() {
          return I18n.t("notifications.titles.reaction");
        }

        get linkHref() {
          const superHref = super.linkHref;
          if (superHref) {
            return superHref;
          }
          let activityName = "reactions-received";

          // All collapsed notifications were "likes"
          if (this.notification.data.reaction_icon) {
            activityName = "likes-received";
          }
          return userPath(
            `${this.currentUser.username}/notifications/${activityName}?acting_username=${this.notification.data.display_username}&include_likes=true`
          );
        }

        get icon() {
          return (
            this.notification.data.reaction_icon ||
            `notification.${this.notificationName}`
          );
        }

        get label() {
          const count = this.notification.data.count;
          const username = this.username;

          if (!count || count === 1 || !this.notification.data.username2) {
            return username;
          }

          if (count > 2) {
            return I18n.t("notifications.reaction_multiple_users", {
              username,
              count: count - 1,
            });
          } else {
            return I18n.t("notifications.reaction_2_users", {
              username,
              username2: formatUsername(this.notification.data.username2),
            });
          }
        }

        get labelClasses() {
          if (this.notification.data.username2) {
            if (this.notification.data.count > 2) {
              return ["multi-user"];
            } else {
              return ["double-user"];
            }
          }
        }

        get description() {
          if (
            this.notification.data.count > 1 &&
            !this.notification.data.username2
          ) {
            return I18n.t("notifications.reaction_1_user_multiple_posts", {
              count: this.notification.data.count,
            });
          }
          return super.description;
        }
      };
    });
  }
}

export default {
  name: "discourse-reactions",

  initialize(container) {
    const siteSettings = container.lookup("site-settings:main");
    if (siteSettings.discourse_reactions_enabled) {
      withPluginApi("0.10.1", initializeDiscourseReactions);
    }
  },

  teardown() {
    resetCurrentReaction();
  },
};
