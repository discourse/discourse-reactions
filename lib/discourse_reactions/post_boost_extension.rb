# frozen_string_literal: true

module DiscourseReactions
  module PostBoostExtension
    def self.included(base)
      base.has_many :boosts, class_name: "DiscourseReactions::Boost", dependent: :destroy
    end
  end
end
