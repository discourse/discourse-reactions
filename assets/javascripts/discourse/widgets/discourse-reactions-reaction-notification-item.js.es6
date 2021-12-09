import { createWidgetFrom } from "discourse/widgets/widget";
import { DefaultNotificationItem } from "discourse/widgets/default-notification-item";
import { replaceIcon } from "discourse-common/lib/icon-library";
import { formatUsername, postUrl } from "discourse/lib/utilities";
import { userPath } from "discourse/lib/url";
import I18n from "I18n";

replaceIcon("notification.reaction", "discourse-emojis");

createWidgetFrom(DefaultNotificationItem, "reaction-notification-item", {
  notificationTitle() {
    return I18n.t(
      "notifications.discourse_reactions.notifications.titles.reactions"
    );
  },

  text(_notificationName, data) {
    const reactionsCount = data.count;

    if (!reactionsCount || reactionsCount === 1) {
      return I18n.t("notifications.reaction.single", {
        username: formatUsername(data.display_username),
        description: this.attrs.fancy_title,
      });
    } else {
      return I18n.t("notifications.reaction.multiple", {
        username: formatUsername(data.display_username),
        count: reactionsCount,
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
