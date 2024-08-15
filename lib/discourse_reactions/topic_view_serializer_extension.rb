# frozen_string_literal: true

module DiscourseReactions::TopicViewSerializerExtension
  def self.load_post_action_reaction_users_for_posts(post_ids)
    PostAction
      .includes(reaction_user: :reaction)
      .joins(
        "LEFT JOIN discourse_reactions_reaction_users ON discourse_reactions_reaction_users.post_id = post_actions.post_id AND discourse_reactions_reaction_users.user_id = post_actions.user_id",
      )
      .where(post_id: post_ids)
      .where("post_actions.deleted_at IS NULL")
      .where(post_action_type_id: PostActionType::LIKE_POST_ACTION_ID)
      .where(
        "post_actions.post_id IN (#{DiscourseReactions::PostActionExtension.post_action_with_reaction_user_sql})",
        valid_reactions: DiscourseReactions::Reaction.reactions_counting_as_like,
      )
  end

  def posts
    if SiteSetting.discourse_reactions_enabled
      posts = object.posts.includes(:post_actions, reactions: { reaction_users: :user })
      post_ids = posts.map(&:id).uniq

      posts_reaction_users_count = TopicViewSerializer.posts_reaction_users_count(post_ids)
      posts.each { |post| post.reaction_users_count = posts_reaction_users_count[post.id].to_i }

      post_actions_with_reaction_users =
        DiscourseReactions::TopicViewSerializerExtension.load_post_action_reaction_users_for_posts(
          post_ids,
        )

      posts.each do |post|
        post.post_actions_with_reaction_users =
          post_actions_with_reaction_users.select { |post_action| post_action.post_id == post.id }
      end

      object.instance_variable_set(:@posts, posts)
    end
    super
  end

  def self.prepended(base)
    def base.posts_reaction_users_count(post_ids)
      posts_reaction_users_count_query =
        DB.query(
          <<~SQL,
        SELECT union_subquery.post_id, COUNT(DISTINCT(union_subquery.user_id)) FROM (
            SELECT user_id, post_id FROM post_actions
              WHERE post_id IN (:post_ids)
                AND post_action_type_id = :like_id
                AND deleted_at IS NULL
          UNION ALL
            SELECT discourse_reactions_reaction_users.user_id, posts.id from posts
              LEFT JOIN discourse_reactions_reactions ON discourse_reactions_reactions.post_id = posts.id
              LEFT JOIN discourse_reactions_reaction_users ON discourse_reactions_reaction_users.reaction_id = discourse_reactions_reactions.id
              WHERE posts.id IN (:post_ids)
        ) AS union_subquery WHERE union_subquery.post_ID IS NOT NULL GROUP BY union_subquery.post_id
      SQL
          post_ids: Array.wrap(post_ids),
          like_id: PostActionType::LIKE_POST_ACTION_ID,
        )

      posts_reaction_users_count_query.each_with_object({}) do |row, hash|
        hash[row.post_id] = row.count
      end
    end
  end
end
