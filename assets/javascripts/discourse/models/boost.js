import { tracked } from "@glimmer/tracking";

export default class Boost {
  @tracked cooked;
  @tracked createdAt;
  @tracked user;
}
