# frozen_string_literal: true

module DiscourseReactions::PostExtension
  def self.prepended(base)
    base.has_many :reactions, class_name: 'DiscourseReactions::Reaction'
    base.attr_accessor :user_positively_reacted, :reaction_users_count
  end
end
