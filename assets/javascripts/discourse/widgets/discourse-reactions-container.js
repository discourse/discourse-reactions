import { createWidget } from "discourse/widgets/widget";
import RenderGlimmer from "discourse/widgets/render-glimmer";
import { hbs } from "ember-cli-htmlbars";

export default createWidget("discourse-reactions-container", {
  html(attrs) {
    return [
      new RenderGlimmer(
        this,
        `div.discourse-reactions-actions`,
        hbs`
          <DiscourseReactionsActions 
            @post={{@data.post}} 
            @position={{@data.position}} 
            @capabilities={{@data.capabilities}} 
          />`,
        {
          post: attrs.post,
          position: attrs.position,
          capabilities: this.capabilities,
        }
      ),
    ];
  },
});
