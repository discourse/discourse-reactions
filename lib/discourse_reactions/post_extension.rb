# frozen_string_literal: true

module DiscourseReactions::PostExtension
  def self.prepended(base)
    base.has_many :reactions, class_name: 'DiscourseReactions::Reaction'
    base.attr_accessor :default_reaction_clicked
  end
end
