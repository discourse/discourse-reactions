# frozen_string_literal: true

module DiscourseReactions::TopicViewSerializerExtension
  def posts
    if SiteSetting.discourse_reactions_enabled
      posts = object.posts.includes(reactions: { reaction_users: :user })
      post_ids = posts.map(&:id)

      posts_user_positively_reacted =
        if scope.user
          PostAction.where(user: scope.user, post: post_ids, post_action_type_id: PostActionType.types[:like]).pluck(:post_id)
        end

      posts_reaction_users_count_query = DB.query(<<~SQL, post_ids: post_ids, like_id: PostActionType.types[:like])
        SELECT posts.id,
        COUNT(DISTINCT(ARRAY[post_actions.user_id] || ARRAY[discourse_reactions_reaction_users.user_id]))
        FROM posts
        LEFT JOIN discourse_reactions_reactions ON discourse_reactions_reactions.post_id = posts.id
        LEFT JOIN discourse_reactions_reaction_users ON discourse_reactions_reaction_users.reaction_id = discourse_reactions_reactions.id
        LEFT JOIN post_actions on post_actions.post_id = discourse_reactions_reactions.post_id
        WHERE post_actions.post_action_type_id = :like_id
        AND posts.id IN (:post_ids)
        GROUP BY posts.id
      SQL
      posts_reaction_users_count = posts_reaction_users_count_query.each_with_object({}) do |row, hash|
        hash[row.id] = row.count
      end

      posts.each do |post|
        post.user_positively_reacted = posts_user_positively_reacted&.include?(post.id)
        post.reaction_users_count = posts_reaction_users_count[post.id].to_i
      end

      object.instance_variable_set(:@posts, posts)
    end
    super
  end
end
