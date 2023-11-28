# frozen_string_literal: true

module DiscourseReactions
  class BoostUserSerializer < ApplicationSerializer
    attributes :data

    def data
      {
        type: "users",
        id: object.id,
        attributes: {
          username: object.username,
          avatar_template: object.avatar_template,
        },
      }
    end
  end
end
