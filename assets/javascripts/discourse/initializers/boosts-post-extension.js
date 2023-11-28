import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "boosts-post-extension",

  initialize() {
    withPluginApi("0.12.1", (api) => {
      api.decorateWidget("post-menu:before-extra-controls", (dec) => {
        const post = dec.getModel();
        if (!post || post.deleted_at) {
          return;
        }

        return dec.attach("boosts-post-button-shim", { post });
      });

      api.decorateWidget("post-menu:after", (dec) => {
        const post = dec.getModel();
        if (!post || post.deleted_at) {
          return;
        }

        return dec.attach("boosts-post-shim", {
          post,
        });
      });
    });
  },
};
