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
        reaction_for_icon(SiteSetting.discourse_reactions_like_icon),
        *SiteSetting.discourse_reactions_enabled_reactions.split(/\|-?/)
      ]
    end

    def self.positive_reactions
      (valid_reactions - negative_or_neutral_reactions).to_set
    end

    def self.negative_or_neutral_reactions
      SiteSetting.discourse_reactions_enabled_reactions.split('|').map do |reaction|
        reaction =~ /^\-/ ? reaction.delete_prefix("-") : nil
      end.compact.to_set
    end

    def positive?
      self.class.positive_reactions.include?(reaction_value)
    end

    def negative?
      self.class.negative_or_neutral_reactions.include?(reaction_value)
    end

    private

    def self.reaction_for_icon(icon)
      case icon
      when 'heart'
        'heart'
      when 'star'
        'star'
      when 'thumbs-up'
        'thumbsup'
      else
        'heart'
      end
    end
  end
end
