# frozen_string_literal: true

module DiscourseReactions
  class CreateBoost
    def initialize(post_id, raw, current_user)
      @post_id = post_id
      @raw = raw
      @current_user = current_user
    end

    def self.call(post_id, raw, current_user)
      new(post_id, raw, current_user).create
    end

    def create
      if !@current_user.in_any_groups?(
           SiteSetting.discourse_reactions_boosts_allowed_groups.split("|").map(&:to_i),
         )
        return
      end

      boosts_count = DiscourseReactions::Boost.where(post_id: @post_id).count
      if boosts_count >= SiteSetting.discourse_reactions_boosts_per_post
        p "TOO MANY"
        return
      end

      post = Post.joins(:topic).find(@post_id)
      cooked = PrettyText.strip_links(PrettyText.cook(@raw))

      boost =
        DiscourseReactions::Boost.create(
          user: @current_user,
          post: post,
          topic: post.topic,
          raw: @raw,
          cooked: cooked,
        )

      if boost.valid?
        publish_boost(boost, post, @current_user)
        create_notification(boost, post, @current_user)
      else
        p "ERROR"
      end
    end

    private

    def publish_boost(boost, post, user)
      MessageBus.publish(
        "/boosts/#{boost.topic_id}",
        {
          type: "create-boost",
          post_id: post.id,
          topic_id: post.topic_id,
          boost:
            DiscourseReactions::BoostSerializer.new(
              boost,
              scope: user.guardian,
              root: false,
            ).as_json,
        },
        user_ids: User.boost_allowed.pluck(:id),
      )
    end

    def create_notification(boost, post, user)
      return if post.user == user

      opts = {
        user_id: user.id,
        display_username: user.username,
        custom_data: {
          cooked: boost.cooked,
        },
      }

      PostAlerter.new.create_notification(post.user, Notification.types[:boost], post, opts)
    end
  end
end
