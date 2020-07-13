# frozen_string_literal: true

module DiscourseReactions::TopicViewSerializerExtension
  def posts
    if SiteSetting.discourse_reactions_enabled
      posts = object.posts.includes(reactions: { reaction_users: :user })
      post_ids = posts.map(&:id)

      posts_user_positively_reacted =
        if scope.user
          DiscourseReactions::Reaction
            .where(post_id: post_ids, reaction_value: DiscourseReactions::Reaction.positive_reactions)
            .joins(:reaction_users)
            .where(discourse_reactions_reaction_users: { user_id: scope.user.id })
            .pluck(:post_id)

        end

      posts_reaction_users_count_query = DB.query(<<~SQL, post_ids: post_ids)
        SELECT discourse_reactions_reactions.post_id, COUNT(DISTINCT(discourse_reactions_reaction_users.user_id))
        FROM discourse_reactions_reactions
        LEFT JOIN discourse_reactions_reaction_users ON discourse_reactions_reaction_users.reaction_id = discourse_reactions_reactions.id
        WHERE discourse_reactions_reactions.post_id IN (:post_ids)
        GROUP BY discourse_reactions_reactions.post_id
      SQL
      posts_reaction_users_count = posts_reaction_users_count_query.each_with_object({}) do |row, hash|
        hash[row.post_id] = row.count
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
