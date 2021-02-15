export default {
  resource: "user.userActivity",
  map() {
    this.route("myReactions", { path: "my-reactions" });
  }
};
