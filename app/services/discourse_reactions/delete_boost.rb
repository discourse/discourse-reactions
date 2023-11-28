# frozen_string_literal: true

module DiscourseReactions
  class DeleteBoost
    def initialize(boost_id, current_user)
      @boost_id = boost_id
      @current_user = current_user
    end

    def self.call(boost_id, current_user)
      new(boost_id, current_user).delete
    end

    def delete
      boost = DiscourseReactions::Boost.find(@boost_id)
      boost.destroy
      publish_deleted_boost(boost) if boost.destroyed?
    end

    def publish_deleted_boost(boost)
      MessageBus.publish(
        "/boosts/#{boost.topic_id}",
        { type: "delete-boost", post_id: boost.post_id, boost_id: boost.id },
        user_ids: User.boost_allowed.pluck(:id),
      )
    end
  end
end
