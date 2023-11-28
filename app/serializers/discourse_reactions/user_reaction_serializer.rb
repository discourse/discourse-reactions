# frozen_string_literal: true

module DiscourseReactions
  class UserReactionSerializer < ApplicationSerializer
    attributes :id, :user_id, :post_id, :created_at

    has_one :user, serializer: GroupPostUserSerializer, embed: :object
    has_one :post, serializer: GroupPostSerializer, embed: :object
    has_one :reaction, embed: :object
  end
end
