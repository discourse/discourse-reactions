# frozen_string_literal: true

module DiscourseReactions::PostActionExtension
  def reaction_user
    return if self.post_action_type_id != PostActionType.types[:like]
    @reaction_user ||=
      DiscourseReactions::ReactionUser.find_by(post_id: self.post_id, user_id: self.user_id)
  end

  def self.filter_reaction_likes_sql
    <<~SQL
      post_actions.post_action_type_id = :like
      AND post_actions.deleted_at IS NULL
      AND post_actions.post_id NOT IN (
        #{post_action_with_reaction_user_sql}
      )
    SQL
  end

  def self.post_action_with_reaction_user_sql
    <<~SQL
      SELECT discourse_reactions_reaction_users.post_id
      FROM discourse_reactions_reaction_users
      INNER JOIN discourse_reactions_reactions ON discourse_reactions_reactions.id = discourse_reactions_reaction_users.reaction_id
      WHERE discourse_reactions_reaction_users.user_id = post_actions.user_id
        AND discourse_reactions_reaction_users.post_id = post_actions.post_id
      AND discourse_reactions_reactions.reaction_value IN (:valid_reactions)
    SQL
  end
end
