# frozen_string_literal: true

module DiscourseReactions::TopicViewSerializerExtension
  def posts
    if SiteSetting.discourse_reactions_enabled
      posts = object.posts.includes(reactions: { reaction_users: :user })

      if scope.user
        posts_default_reaction_used =
          DiscourseReactions::Reaction
            .where(post_id: posts.map(&:id), reaction_value: SiteSetting.discourse_reactions_like_icon)
            .joins(:reaction_users)
            .where(discourse_reactions_reaction_users: { user_id: scope.user.id })
            .pluck(:post_id)

        posts.each do |post|
          post.default_reaction_used = posts_default_reaction_used.include?(post.id)
        end
      end

      object.instance_variable_set(:@posts, posts)
    end
    super
  end
end
