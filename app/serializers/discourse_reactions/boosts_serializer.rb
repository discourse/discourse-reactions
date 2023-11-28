# frozen_string_literal: true

module DiscourseReactions
  class BoostsSerializer < ApplicationSerializer
    attributes :data, :included

    def data
      object.map { |boost| BoostSerializer.new(boost, scope: scope, root: false).as_json }
    end

    def included
      object
        .map(&:user)
        .uniq
        .map { |user| BoostUserSerializer.new(user, scope: scope, root: false).as_json[:data] }
    end
  end
end
