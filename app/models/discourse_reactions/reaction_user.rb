# frozen_string_literal: true

module DiscourseReactions
  class ReactionUser < ActiveRecord::Base
    self.table_name = 'discourse_reactions_reaction_users'

    belongs_to :reaction, class_name: 'DiscourseReactions::Reaction', counter_cache: true
    belongs_to :user
    belongs_to :post

    delegate :username, to: :user, allow_nil: true
    delegate :avatar_template, to: :user, allow_nil: true
  end
end
