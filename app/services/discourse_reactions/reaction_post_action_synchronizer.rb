# frozen_string_literal: true

module DiscourseReactions
  class ReactionPostActionSynchronizer
    def self.sync!
      excluded_from_like = SiteSetting.discourse_reactions_excluded_from_like.to_s.split("|")

      # Find all ReactionUser records that do not have a
      # corresponding PostAction record, for any reactions
      # that are not in excluded_from_like, and create a
      # PostAction record for each.
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
         AND discourse_reactions_reactions.reaction_value NOT IN (:excluded_from_like)
      SQL
      DB.exec(sql_query, like: PostActionType.types[:like], excluded_from_like: excluded_from_like)

      # Find all PostAction records that have a ReactionUser
      # record that uses a reaction in the excluded_from_like
      # list, and delete them.
      sql_query = <<~SQL
        DELETE FROM post_actions
        USING discourse_reactions_reaction_users ru
        INNER JOIN discourse_reactions_reactions
          ON discourse_reactions_reactions.id = ru.reaction_id
        WHERE post_actions.user_id = ru.user_id
          AND post_actions.post_id = ru.post_id
          AND post_actions.post_action_type_id = :like
          AND discourse_reactions_reactions.reaction_value IN (:excluded_from_like)
      SQL
      DB.exec(sql_query, like: PostActionType.types[:like], excluded_from_like: excluded_from_like)
    end
  end
end
