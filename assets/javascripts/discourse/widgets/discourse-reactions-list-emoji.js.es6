import { h } from "virtual-dom";
import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { createWidget } from "discourse/widgets/widget";

const DISPLAY_MAX_USERS = 19;

export default createWidget("discourse-reactions-list-emoji", {
  tagName: "span",

  buildAttributes(attrs) {
    const users = attrs.reaction.users;

    let title = `${attrs.reaction.id}`;
    let i = 0;

    while(i <= DISPLAY_MAX_USERS && i < users.length) {
      title += `${users[i].username} `;
      i++;
    }

    if(attrs.reaction.count > DISPLAY_MAX_USERS) {
      title += I18n.t("discourse_reactions.state_panel.more_users", {
        count: attrs.reaction.count - DISPLAY_MAX_USERS
      });
    }

    return {
      title: title
    };
  },

  buildClasses(attrs) {
    const classes = [];
    classes.push(`discourse-reactions-list-emoji-${attrs.reaction.id}`);

    classes.push("reaction");

    classes.push(attrs.reaction.id.toString());

    return classes;
  },

  html(attrs) {
    const reaction = attrs.reaction;

    if (attrs.reaction.count <= 0) {
      return;
    }

    return new RawHtml({
      html: emojiUnescape(`:${reaction.id}:`)
    });
  }
});
