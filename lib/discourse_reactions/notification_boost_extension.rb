# frozen_string_literal: true

module DiscourseReactions
  module NotificationBoostExtension
    def types
      @types_with_reaction ||= super.merge(boost: 39)
    end
  end
end
