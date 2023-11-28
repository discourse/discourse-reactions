# frozen_string_literal: true

module DiscourseReactions
  class BoostSerializer < ApplicationSerializer
    attributes :data

    def data
      {
        type: "boosts",
        id: object.id,
        attributes: {
          cooked: object.cooked,
          created_at: object.created_at,
        },
        relationships: {
          user: {
            data: {
              type: "users",
              id: object.user_id,
            },
          },
        },
      }
    end
  end
end
