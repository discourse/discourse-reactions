# frozen_string_literal: true

module DiscourseReactions::PostExtension
  def self.prepended(base)
    base.has_many :reactions, class_name: 'DiscourseReactions::Reaction'
  end
end
