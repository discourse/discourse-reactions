import { hbs } from "ember-cli-htmlbars";
import { registerWidgetShim } from "discourse/widgets/render-glimmer";

registerWidgetShim(
  "boosts-post-shim",
  "div.boosts-post-shim",
  hbs`<BoostsContainer @post={{@data.post}} />`
);
