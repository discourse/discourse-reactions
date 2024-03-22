# frozen_string_literal: true

module DiscourseReactions
  class ReactionLikeSynchronizer
    def self.sync!
      return if !SiteSetting.discourse_reactions_like_sync_enabled

      excluded_from_like = SiteSetting.discourse_reactions_excluded_from_like.to_s.split("|")

      inserted_post_action_ids = create_missing_post_actions(excluded_from_like)
      recovered_post_action_ids = recover_trashed_post_actions(excluded_from_like)

      post_action_ids = (recovered_post_action_ids + inserted_post_action_ids).uniq
      create_missing_user_actions(post_action_ids)

      trashed_post_action_ids = trash_excluded_related_records(excluded_from_like)

      all_affected_post_action_ids = (post_action_ids + trashed_post_action_ids).uniq
      all_affected_post_ids =
        PostAction.with_deleted.where(id: all_affected_post_action_ids).pluck(:post_id).uniq

      update_post_like_counts(all_affected_post_action_ids)
      update_topic_like_counts(all_affected_post_action_ids)

      TopicUser.update_post_action_cache(post_id: all_affected_post_ids)

      update_user_stats(all_affected_post_ids)
    end

    # Find all ReactionUser records that do not have a corresponding
    # PostAction like record, for any reactions that are not in
    # excluded_from_like, and create a PostAction record for each.
    def self.create_missing_post_actions(excluded_from_like)
      sql_query = <<~SQL
        INSERT INTO post_actions(
          post_id, user_id, post_action_type_id, created_at, updated_at
        )
        SELECT ru.post_id, ru.user_id, :like, ru.created_at, ru.updated_at
        FROM discourse_reactions_reaction_users ru
        INNER JOIN discourse_reactions_reactions
          ON discourse_reactions_reactions.id = ru.reaction_id
        LEFT JOIN post_actions
          ON post_actions.user_id = ru.user_id
          AND post_actions.post_id = ru.post_id
        WHERE post_actions.id IS NULL
        #{excluded_from_like.any? ? " AND discourse_reactions_reactions.reaction_value NOT IN (:excluded_from_like)" : ""}
        RETURNING post_actions.id
      SQL

      DB.query_single(
        sql_query,
        like: PostActionType.types[:like],
        excluded_from_like: excluded_from_like,
      )
    end

    def self.recover_trashed_post_actions(excluded_from_like)
      # Find all trashed PostAction records matching ReactionUser records,
      # which are not in excluded_from_like, and untrash them.
      sql_query = <<~SQL
        UPDATE post_actions
        SET deleted_at = NULL, deleted_by_id = NULL, updated_at = NOW()
        FROM discourse_reactions_reaction_users ru
        INNER JOIN discourse_reactions_reactions
          ON discourse_reactions_reactions.id = ru.reaction_id
        WHERE post_actions.deleted_at IS NOT NULL AND post_actions.user_id = ru.user_id
          AND post_actions.post_id = ru.post_id AND post_actions.post_action_type_id = :like
        #{excluded_from_like.any? ? " AND discourse_reactions_reactions.reaction_value NOT IN (:excluded_from_like)" : ""}
      SQL

      DB.query_single(
        sql_query,
        like: PostActionType.types[:like],
        excluded_from_like: excluded_from_like,
      )
    end

    # Create the corresponding UserAction records for the PostAction records. In
    # the ReactionManager, this is done via PostActionCreator.
    #
    # The only difference between LIKE and WAS LIKED is the user;
    #   * LIKE is the post action user because they are the one who liked the post
    #   * WAS LIKED is done by the post user, because they are the like-ee
    #
    # No need to do any UserAction inserts if there wasn't any PostAction changes.
    def self.create_missing_user_actions(post_action_ids)
      return [] if post_action_ids.none?

      sql_query = <<~SQL
        INSERT INTO user_actions (
          action_type, user_id, acting_user_id, target_post_id, target_topic_id, created_at, updated_at
        )
        SELECT :ua_like,
               post_actions.user_id,
               post_actions.user_id,
               post_actions.post_id,
               posts.topic_id,
               post_actions.created_at,
               post_actions.created_at
        FROM post_actions
        INNER JOIN posts ON posts.id = post_actions.post_id
        WHERE post_actions.id IN (:post_action_ids) AND posts.user_id IS NOT NULL
        ON CONFLICT DO NOTHING;

        INSERT INTO user_actions (
          action_type, user_id, acting_user_id, target_post_id, target_topic_id, created_at, updated_at
        )
        SELECT :ua_was_liked,
               posts.user_id,
               post_actions.user_id,
               post_actions.post_id,
               posts.topic_id,
               post_actions.created_at,
               post_actions.created_at
        FROM post_actions
        INNER JOIN posts ON posts.id = post_actions.post_id
        WHERE post_actions.id IN (:post_action_ids) AND posts.user_id IS NOT NULL
        ON CONFLICT DO NOTHING;
      SQL

      DB.exec(
        sql_query,
        ua_like: UserAction::LIKE,
        ua_was_liked: UserAction::WAS_LIKED,
        post_action_ids: post_action_ids,
      )
    end

    # Find all PostAction records that have a ReactionUser record that
    # uses a reaction in the excluded_from_like list, and trash them,
    # and also delete the UserAction records.
    def self.trash_excluded_related_records(excluded_from_like)
      return [] if excluded_from_like.none?

      sql_query = <<~SQL
        WITH deleted_post_actions AS (
          UPDATE post_actions
          SET deleted_at = NOW()
          FROM discourse_reactions_reaction_users ru
          INNER JOIN discourse_reactions_reactions ON discourse_reactions_reactions.id = ru.reaction_id
          WHERE post_actions.user_id = ru.user_id
            AND post_actions.post_id = ru.post_id
            AND post_actions.post_action_type_id = :like
            AND discourse_reactions_reactions.reaction_value IN (:excluded_from_like)
          RETURNING post_actions.id, post_actions.post_id, post_actions.user_id
        )

        DELETE FROM user_actions
        USING deleted_post_actions
        WHERE user_actions.target_post_id = deleted_post_actions.post_id
        AND user_actions.acting_user_id = deleted_post_actions.user_id
        AND user_actions.action_type IN (:ua_like, :ua_was_liked)

        RETURNING deleted_post_actions.id
      SQL

      DB.query_single(
        sql_query,
        like: PostActionType.types[:like],
        excluded_from_like: excluded_from_like,
        ua_like: UserAction::LIKE,
        ua_was_liked: UserAction::WAS_LIKED,
      )
    end

    def self.update_post_like_counts(all_affected_post_action_ids)
      sql_query = <<~SQL
        WITH like_counts AS (
          SELECT posts.id AS post_id,
            COUNT(post_actions.id) FILTER (
              WHERE post_actions.post_action_type_id = :like AND
              post_actions.deleted_at IS NULL
            ) AS like_count
          FROM posts
          LEFT JOIN post_actions ON post_actions.post_id = posts.id
            AND post_actions.post_action_type_id = :like
          WHERE post_actions.id IN (:all_affected_post_action_ids)
          GROUP BY posts.id
        )
        UPDATE posts
        SET like_count = like_counts.like_count
        FROM like_counts
        WHERE posts.id = like_counts.post_id
      SQL
      DB.exec(
        sql_query,
        like: PostActionType.types[:like],
        all_affected_post_action_ids: all_affected_post_action_ids,
      )
    end

    def self.update_topic_like_counts(all_affected_post_action_ids)
      sql_query = <<~SQL
        WITH like_counts AS (
          SELECT topics.id AS topic_id, SUM(posts.like_count) AS like_count
          FROM topics
          LEFT JOIN posts ON posts.topic_id = topics.id
          WHERE posts.id IN (
            SELECT post_id FROM post_actions WHERE id IN (:all_affected_post_action_ids)
          )
          GROUP BY topics.id
        )
        UPDATE topics
        SET like_count = like_counts.like_count
        FROM like_counts
        WHERE topics.id = like_counts.topic_id
      SQL
      DB.exec(
        sql_query,
        like: PostActionType.types[:like],
        all_affected_post_action_ids: all_affected_post_action_ids,
      )
    end

    def self.update_user_stats
    end
  end
end
