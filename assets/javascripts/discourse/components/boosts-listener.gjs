import Component from "@glimmer/component";
import { modifier } from "ember-modifier";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Boost from "discourse/plugins/discourse-reactions/discourse/models/boost";

export default class BoostsListener extends Component {
  <template>
    <div {{this.setupBoosts}} {{this.listener}}></div>
  </template>

  @service currentUser;
  @service messageBus;
  @service store;

  listener = modifier(() => {
    this.messageBus.subscribe(
      "/boosts/" + this.args.topic.id,
      this.handleBoost
    );

    return () => {
      this.messageBus.unsubscribe(
        "/boosts/" + this.args.topic.id,
        this.handleBoost
      );
    };
  });

  setupBoosts = modifier(() => {
    this.args.topic.postStream.posts.forEach((post) => {
      post.set("boosts", this.processRawBoosts(post.boosts));
    });
  });

  @action
  handleBoost(data) {
    switch (data.type) {
      case "delete-boost":
        this.handleDeleteBoost(data);
        break;
      case "create-boost":
        this.handleCreateBoost(data);
        break;
      default:
        break;
    }
  }

  handleCreateBoost(data) {
    const loadedPost = this.args.topic.postStream.findLoadedPost(data.post_id);
    loadedPost.set("boosts", [...loadedPost.boosts, data.boost]);
  }

  handleDeleteBoost(data) {
    const loadedPost = this.args.topic.postStream.findLoadedPost(data.post_id);
    loadedPost.set(
      "boosts",
      loadedPost.boosts.filter((boost) => boost.id !== data.boost_id)
    );
  }

  processRawBoosts(boosts) {
    return (boosts.data || []).map((rawBoost) => {
      return this.processRawBoost(rawBoost, boosts.included);
    });
  }

  processRawBoost(rawBoost, includes) {
    const boost = new Boost();
    boost.id = rawBoost.data.id;
    boost.cooked = rawBoost.data.attributes.cooked;
    boost.createdAt = rawBoost.data.attributes.createdAt;
    boost.user = this.store.createRecord(
      "user",
      includes.find((included) => {
        return (
          included.id === rawBoost.data.relationships.user.data.id &&
          included.type === "users"
        );
      }).attributes
    );
    return boost;
  }
}
