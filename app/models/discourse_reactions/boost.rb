# frozen_string_literal: true

module DiscourseReactions
  class Boost < ActiveRecord::Base
    include Trashable

    belongs_to :user
    belongs_to :post
    belongs_to :topic

    self.table_name = "discourse_reactions_boosts"
  end
end

# == Schema Information
#
# Table name: discourse_reactions_boosts
#
#  id              :bigint           not null, primary key
#  user_id         :bigint           not null
#  post_id         :bigint           not null
#  topic_id        :bigint           not null
#  raw             :string           not null
#  cooked          :string           not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#
