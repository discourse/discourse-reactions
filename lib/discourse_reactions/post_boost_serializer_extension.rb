# frozen_string_literal: true

module DiscourseReactions
  module PostBoostSerializerExtension
    def self.included(base)
      base.attributes(:boosts)
    end

    def boosts
      return [] if !@topic_view

      DiscourseReactions::BoostsSerializer.new(
        (@topic_view.boosts[object.id] || []),
        scope: scope,
        root: false,
      ).as_json
    end
  end
end
