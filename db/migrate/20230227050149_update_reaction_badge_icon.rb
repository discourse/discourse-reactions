# frozen_string_literal: true

class UpdateReactionBadgeIcon < ActiveRecord::Migration[7.0]
  def change
    execute "UPDATE badges SET icon = 'smile' WHERE name = 'First Reaction'"
  end
end
