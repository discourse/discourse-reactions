# frozen_string_literal: true

module DiscourseReactions
  class ReactionPostActionSynchronizer
    def self.sync!
      return if !SiteSetting.discourse_reactions_like_sync_enabled

      excluded_from_like = SiteSetting.discourse_reactions_excluded_from_like.to_s.split("|")

      # Find all ReactionUser records that do not have a corresponding PostAction record,
      # for any reactions that are not in excluded_from_like, and create a PostAction record for each.
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

      inserted_post_action_ids =
        DB.query_single(
          sql_query,
          like: PostActionType.types[:like],
          excluded_from_like: excluded_from_like,
        )

      # Find all trashed PostAction records matching ReactionUser records, which are not in excluded_from_like,
      # and untrash them.
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
      recovered_post_action_ids =
        DB.query_single(
          sql_query,
          like: PostActionType.types[:like],
          excluded_from_like: excluded_from_like,
        )

      # Create the corresponding UserAction records for the PostAction records. In
      # the ReactionManager, this is done via PostActionCreator.
      #
      # The only difference between LIKE and WAS LIKED is the user;
      #   * LIKE is the post action user because they are the one who liked the post
      #   * WAS LIKED is done by the post user, because they are the like-ee
      #
      # No need to do any UserAction inserts if there wasn't any PostAction changes.
      post_action_ids = (recovered_post_action_ids + inserted_post_action_ids).uniq
      if post_action_ids.any?
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
      # uses a reaction in the excluded_from_like list, and trash them.
      if excluded_from_like.any?
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
            RETURNING post_actions.post_id, post_actions.user_id
          )

          DELETE FROM user_actions
          USING deleted_post_actions
          WHERE user_actions.target_post_id = deleted_post_actions.post_id
          AND user_actions.acting_user_id = deleted_post_actions.user_id
          AND user_actions.action_type IN (:ua_like, :ua_was_liked)
        SQL
        DB.exec(
          sql_query,
          like: PostActionType.types[:like],
          excluded_from_like: excluded_from_like,
          ua_like: UserAction::LIKE,
          ua_was_liked: UserAction::WAS_LIKED,
        )
      end
    end
  end
end
