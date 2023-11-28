import { hbs } from "ember-cli-htmlbars";
import { registerWidgetShim } from "discourse/widgets/render-glimmer";

registerWidgetShim(
  "boosts-post-button-shim",
  "div.boosts-post-button-shim",
  hbs`<AddBoostButton @post={{@data.post}} />`
);
