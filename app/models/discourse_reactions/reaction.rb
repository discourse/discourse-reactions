# frozen_string_literal: true

module DiscourseReactions
  class Reaction < ActiveRecord::Base
    self.table_name = 'discourse_reactions_reactions'

    enum reaction_type: { emoji: 0 }

    has_many :reaction_users, class_name: 'DiscourseReactions::ReactionUser'
    has_many :users, through: :reaction_users
    belongs_to :post

    def self.valid_reactions
      SiteSetting.discourse_reactions_enabled_reactions.split(/\|-?/)
    end

    def self.positive_reactions
      valid_reactions - negative_or_neutral_reactions
    end

    def self.negative_or_neutral_reactions
      SiteSetting.discourse_reactions_enabled_reactions.split('|').map do |reaction|
        reaction =~ /^\-/ ? reaction.delete_prefix("-") : nil
      end.compact
    end
  end
end
