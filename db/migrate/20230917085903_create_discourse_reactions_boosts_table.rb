# frozen_string_literal: true

class CreateDiscourseReactionsBoostsTable < ActiveRecord::Migration[7.0]
  def change
    create_table :discourse_reactions_boosts do |t|
      t.bigint :user_id, null: false
      t.bigint :topic_id, null: false
      t.bigint :post_id, null: false
      t.string :raw, limit: 20, null: false
      t.string :cooked, limit: 200, null: false
      t.datetime :deleted_at
      t.timestamps
    end

    add_index :discourse_reactions_boosts, %i[topic_id post_id created_at], name: "post_boosts"
  end
end
