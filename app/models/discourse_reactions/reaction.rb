# frozen_string_literal: true

module DiscourseReactions
  class Reaction < ActiveRecord::Base
    self.table_name = 'discourse_reactions_reactions'

    enum reaction_type: { emoji: 0 }

    has_many :reaction_users, class_name: 'DiscourseReactions::ReactionUser'
    has_many :users, through: :reaction_users
    belongs_to :post

    scope :positive, -> { where(reaction_value: self.positive_reactions) }
    scope :negative_or_neutral, -> { where(reaction_value: self.negative_or_neutral_reactions) }
    scope :by_user, ->(user) { joins(:reaction_users).where(discourse_reactions_reaction_users: { user_id: user.id }) }

    def self.valid_reactions
      Set[
        DiscourseReactions::Reaction.main_reaction_id,
        *SiteSetting.discourse_reactions_enabled_reactions.split(/\|-?/)
      ]
    end

    def self.main_reaction_id
      SiteSetting.discourse_reactions_reaction_for_like.gsub('-', '')
    end
  end
end
