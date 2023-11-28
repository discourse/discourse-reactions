import { withPluginApi } from "discourse/lib/plugin-api";
import { htmlSafe } from "@ember/template";

export default {
  name: "discourse-boosts-notification-extension",

  initialize() {
    withPluginApi("0.12.1", (api) => {
      if (api.registerNotificationTypeRenderer) {
        api.registerNotificationTypeRenderer(
          "boost",
          (NotificationTypeBase) => {
            return class extends NotificationTypeBase {
              get linkHref() {
                return `/t/-/${this.notification.topic_id}/${this.notification.post_number}`;
              }

              get icon() {
                return "rocket";
              }

              get label() {
                return htmlSafe(
                  `${this.notification.data.display_username}: ${this.notification.data.cooked}`
                );
              }
            };
          }
        );
      }
    });
  },
};
