# frozen_string_literal: true

module DiscourseReactions::TopicViewSerializerExtension
  def posts
    if SiteSetting.discourse_reactions_enabled
      posts = object.posts.includes(:post_actions, reactions: { reaction_users: :user })
      post_ids = posts.map(&:id).uniq

      posts_reaction_users_count_query = DB.query(<<~SQL, post_ids: post_ids, like_id: PostActionType.types[:like])
        SELECT union_subquery.post_id, COUNT(DISTINCT(union_subquery.user_id)) FROM (
            SELECT user_id, post_id FROM post_actions
              WHERE post_id IN (:post_ids)
                AND post_action_type_id = :like_id
                AND deleted_at IS NULL
          UNION ALL
            SELECT discourse_reactions_reaction_users.user_id, post_id from posts
              LEFT JOIN discourse_reactions_reactions ON discourse_reactions_reactions.post_id = posts.id
              LEFT JOIN discourse_reactions_reaction_users ON discourse_reactions_reaction_users.reaction_id = discourse_reactions_reactions.id
              WHERE posts.id IN (:post_ids)
        ) AS union_subquery WHERE union_subquery.post_ID IS NOT NULL GROUP BY union_subquery.post_id
      SQL
      posts_reaction_users_count = posts_reaction_users_count_query.each_with_object({}) do |row, hash|
        hash[row.post_id] = row.count
      end

      posts.each do |post|
        post.reaction_users_count = posts_reaction_users_count[post.id].to_i
      end

      object.instance_variable_set(:@posts, posts)
    end
    super
  end
end
