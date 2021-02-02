export default {
  resource: "user.userActivity",
  map() {
    this.route("yourReactions", { path: "your-reactions" });
  },
};
