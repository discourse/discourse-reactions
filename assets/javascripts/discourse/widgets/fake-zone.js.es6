import { createWidget } from "discourse/widgets/widget";

export default createWidget("fake-zone", {
  tagName: "div.fake-zone",

  mouseOut(event) {
    this.callWidgetFunction(this.attrs.collapseFunction, event);
  }
});
