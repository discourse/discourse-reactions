import { createWidgetFrom } from "discourse/widgets/widget";
import { DefaultNotificationItem } from "discourse/widgets/default-notification-item";
import { iconNode, replaceIcon } from "discourse-common/lib/icon-library";
import { formatUsername, postUrl } from "discourse/lib/utilities";
import { userPath } from "discourse/lib/url";
import I18n from "I18n";

replaceIcon("notification.reaction", "discourse-emojis");

createWidgetFrom(DefaultNotificationItem, "reaction-notification-item", {
  notificationTitle() {
    return I18n.t("notifications.titles.reaction");
  },

  icon(notificationName) {
    let reactionName = this.attrs.data.reaction_icon;
    let icon;

    if (reactionName) {
      icon = iconNode(reactionName);
    } else {
      icon = iconNode(`notification.${notificationName}`);
    }

    // TODO(roman): Remove after the 2.8 release.
    icon.properties.attributes["aria-label"] = I18n.t(
      `notifications.titles.${notificationName}`
    );
    icon.properties.attributes["aria-hidden"] = false;
    icon.properties.attributes["role"] = "img";

    return icon;
  },

  text(_notificationName, data) {
    const count = data.count;
    const username = formatUsername(data.display_username);

    if (data.username2) {
      const othersCount = count - 2;
      const notificationKey =
        othersCount === 0 ? "reaction_2" : "reaction_many";

      return I18n.t(`notifications.${notificationKey}`, {
        username,
        username2: formatUsername(data.username2),
        description: this.attrs.fancy_title,
        count: othersCount,
      });
    }

    if (!count || count === 1) {
      return I18n.t("notifications.reaction.single", {
        username: formatUsername(data.display_username),
        description: this.attrs.fancy_title,
      });
    } else {
      return I18n.t("notifications.reaction.multiple", {
        username: formatUsername(data.display_username),
        count,
      });
    }
  },

  url() {
    const topicId = this.attrs.topic_id;

    if (topicId) {
      return postUrl(this.attrs.slug, topicId, this.attrs.post_number);
    } else {
      return userPath(
        `${this.currentUser.username}/notifications/reactions-received`
      );
    }
  },
});
