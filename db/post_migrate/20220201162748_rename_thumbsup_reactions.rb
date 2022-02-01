# frozen_string_literal: true

class RenameThumbsupReactions < ActiveRecord::Migration[6.1]
  def up
    current_reactions = DB.query_single(
      "SELECT value FROM site_settings WHERE name = 'discourse_reactions_enabled_reactions'"
    )[0]

    alias_name = 'thumbsup'
    original_name = '+1'

    if current_reactions
      updated_reactions = current_reactions.gsub(alias_name, original_name)

      DB.exec(<<~SQL, updated_reactions: updated_reactions)
        UPDATE site_settings
        SET value = :updated_reactions
        WHERE name = 'discourse_reactions_enabled_reactions'
      SQL
    end

    DB.exec(<<~SQL, alias: alias_name, new_value: original_name)
      UPDATE discourse_reactions_reactions
      SET reaction_value = :new_value
      WHERE reaction_value = :alias
    SQL
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
