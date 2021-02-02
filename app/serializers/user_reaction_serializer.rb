# frozen_string_literal: true

class UserReactionSerializer < ApplicationSerializer
  include PostItemExcerpt

  attributes :id,
             :created_at,
             :title,
             :url,
             :category_id,
             :post_number,
             :topic_id,
             :post_type,
             :current_user_reaction

  has_one :user, serializer: GroupPostUserSerializer, embed: :object
  has_one :topic, serializer: BasicTopicSerializer, embed: :object

  def title
    object.topic.title
  end

  def include_user_long_name?
    SiteSetting.enable_names?
  end

  def category_id
    object.topic.category_id
  end

  def current_user_reaction
    return nil unless scope.user.present?
    object.reactions.each do |reaction|
      reaction_user = reaction.reaction_users.find { |ru| ru.user_id == scope.user.id }

      next unless reaction_user

      return {
        id: reaction.reaction_value,
        type: reaction.reaction_type.to_sym,
        can_undo: reaction_user.can_undo?,
        avatar_template: reaction_user.avatar_template,
        created_at: reaction_user.created_at,
        reaction_user_id: reaction_user.id
      } if reaction.reaction_users_count
    end
  end
end
