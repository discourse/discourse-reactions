import Service from "@ember/service";
import { ajax } from "discourse/lib/ajax";

/**
 * Discourse Bossts API service. Provides methods to interact with the API.
 *
 * @module DiscourseBoostsApi
 * @implements {@ember/service}
 */
export default class DiscourseBoostsApi extends Service {
  /**
   * Get a thread in a channel by its ID.
   * @param {number} userId - The ID of the user making the boost.
   * @param {number} postId - The ID of the boosted post.
   * @param {string} raw - The raw text of the boost.
   * @returns {Promise}
   *
   * @example
   *
   *    this.api.createBoost(5, 1, "Great!");
   */

  async createBoost(data) {
    await this.#postRequest(`/boosts`, {
      user_id: data.userId,
      post_id: data.postId,
      raw: data.raw,
    });
  }

  async deleteBoost(boostId) {
    await this.#deleteRequest(`/boosts/${boostId}`);
  }

  get #basePath() {
    return "/discourse-reactions/api";
  }

  #putRequest(endpoint, data = {}) {
    return ajax(`${this.#basePath}${endpoint}`, {
      type: "PUT",
      data,
    });
  }

  #deleteRequest(endpoint) {
    return ajax(`${this.#basePath}${endpoint}`, {
      type: "DELETE",
    });
  }

  #postRequest(endpoint, data = {}) {
    return ajax(`${this.#basePath}${endpoint}`, {
      type: "POST",
      data,
    });
  }
}
