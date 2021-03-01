import { h } from "virtual-dom";
import RawHtml from "discourse/widgets/raw-html";
import { emojiUnescape } from "discourse/lib/text";
import { createWidget } from "discourse/widgets/widget";

const DISPLAY_MAX_USERS = 19;

export default createWidget("discourse-reactions-list-emoji", {
  tagName: "span",

  buildClasses(attrs) {
    const classes = [];
    classes.push(`discourse-reactions-list-emoji-${attrs.reaction.id}`);

    classes.push("reaction");

    classes.push(attrs.reaction.id.toString());

    return classes;
  },

  html(attrs) {
    if (attrs.reaction.count <= 0) {
      return;
    }

    const reaction = attrs.reaction;
    const users = attrs.reaction.users;
    const displayUsers = [];
    let i = 0;

    displayUsers.push(h("p.heading", attrs.reaction.id));

    while(i <= DISPLAY_MAX_USERS && i < users.length) {
      displayUsers.push(h('p.username', users[i].username))
      i++;
    }

    if(attrs.reaction.count > DISPLAY_MAX_USERS) {
      displayUsers.push(h("p.other_users", I18n.t("discourse_reactions.state_panel.more_users", {
        count: attrs.reaction.count - DISPLAY_MAX_USERS
      })));
    }

    return [h(`span.reaction.${attrs.reaction.id}`,[new RawHtml({
      html: emojiUnescape(`:${reaction.id}:`, { skipTitle: true })
    }), h('span.user-list', displayUsers)])];
  }
});
