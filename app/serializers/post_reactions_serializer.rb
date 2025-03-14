module DiscourseReactions
  class PostReactionsSerializer < UserActionSerializer
    extend ActiveSupport::Concern

    def action_type
      byebug
      nil
    end

    def target_user_id
      byebug
      object.reactions.reaction_data
    end

    def include_reply_to_post_number?
      nil
    end

    def include_edit_reason?
      nil
    end

    def post_id
      object.id
    end

    def target_name
      object.user.name
    end

    def target_username
      object.user.username
    end

    def avatar_template
      user = object.user
      return nil unless user

      User.avatar_template(user.username, user.uploaded_avatar&.id)
    end

    def acting_avatar_template
      user = object.user
      return nil unless user

      User.avatar_template(user.username, user.user_avatar&.id)
    end

    def include_acting_avatar_template?
      object.user&.username.present?
    end

    def slug
      Slug.for(object.topic.title)
    end

    def include_slug?
      object.topic.title.present?
    end

    def closed
      object.topic.closed
    end

    def archived
      object.topic.archived
    end
  end
end
