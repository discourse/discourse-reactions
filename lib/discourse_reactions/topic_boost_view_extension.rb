# frozen_string_literal: true

module DiscourseReactions
  module TopicBoostViewExtension
    def self.prepended(base)
      base.attr_accessor(:boosts)
    end
  end
end
