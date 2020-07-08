# frozen_string_literal: true

module DiscourseReactions::TopicViewSerializerExtension
  def posts
    if SiteSetting.discourse_reactions_enabled
      posts = object.posts.includes(reactions: { reaction_users: :user })

      if scope.user
        posts_user_positively_reacted =
          DiscourseReactions::Reaction
            .where(post_id: posts.map(&:id), reaction_value: DiscourseReactions::Reaction.positive_reactions)
            .joins(:reaction_users)
            .where(discourse_reactions_reaction_users: { user_id: scope.user.id })
            .pluck(:post_id)

        posts.each do |post|
          post.user_positively_reacted = posts_user_positively_reacted.include?(post.id)
        end
      end

      object.instance_variable_set(:@posts, posts)
    end
    super
  end
end
