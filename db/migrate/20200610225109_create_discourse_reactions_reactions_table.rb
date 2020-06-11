# frozen_string_literal: true

class CreateDiscourseReactionsReactionsTable < ActiveRecord::Migration[6.0]
  def change
    create_table :discourse_reactions_reactions do |t|
      t.integer :post_id
      t.integer :user_id
      t.integer :reaction_type
      t.string :reaction_value
    end
    add_index :discourse_reactions_reactions, :post_id
    add_index :discourse_reactions_reactions, :user_id
  end
end
