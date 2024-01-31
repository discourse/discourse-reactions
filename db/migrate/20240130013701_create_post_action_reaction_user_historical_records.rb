# frozen_string_literal: true

# * create a PostAction(Like) for every ReactionUser
#   record that is _not_ in the discourse_reactions_excluded_from_like
#   list (default only to -1)
# * shouldn't need to create any Reaction records or ReactionUser
#   records
class CreatePostActionReactionUserHistoricalRecords < ActiveRecord::Migration[7.0]
  def up
    sql_query = <<~SQL
      INSERT INTO post_actions(post_id, user_id, post_action_type_id, created_at, updated_at)
      SELECT ru.post_id,
             ru.user_id,
             :post_action_type_id,
             ru.created_at,
             ru.updated_at
      FROM discourse_reactions_reaction_users ru
      INNER JOIN discourse_reactions_reactions ON discourse_reactions_reactions.id = ru.reaction_id
      WHERE discourse_reactions_reactions.reaction_value != :default_excluded_reaction
      ON CONFLICT DO NOTHING
    SQL

    # Like is Post Action Type ID 2
    DB.exec(sql_query, post_action_type_id: 2, default_excluded_reaction: "-1")
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
