# frozen_string_literal: true

module DiscourseReactions
  class CustomReactionsController < DiscourseReactionsController
    before_action :fetch_post_from_params

    def toggle
      return render_json_error(@post) unless DiscourseReactions::Reaction.valid_reactions.include?(params[:reaction])
      ActiveRecord::Base.transaction do
        reaction = reaction_scope.first_or_create
        reaction_user = reaction_user_scope(reaction)&.first_or_initialize

        if reaction_user.persisted?
          unless guardian.can_delete_reaction_user?(reaction_user)
            return render json: failed_json.merge(errors: I18n.t("invalid_access")), status: 400
          end

          reaction_user.destroy
          remove_shadow_like(reaction) if reaction.positive?
          remove_reaction_notification(reaction) if reaction.negative?
        else
          reaction_user.save!
          add_shadow_like(reaction) if reaction.positive?
          add_reaction_notification(reaction) if reaction.negative?
        end
        reaction.destroy if reaction.reload.reaction_users_count == 0
      end

      render_json_dump(post_serializer.as_json)
    end

    private 

    def add_shadow_like(reaction)
      return if DiscourseReactions::Reaction.positive.where(post_id: @post.id).by_user(current_user).count != 1
      PostActionCreator.like(current_user, @post)
    end

    def remove_shadow_like(reaction)
      return if DiscourseReactions::Reaction.positive.where(post_id: @post.id).by_user(current_user).count != 0
      PostActionDestroyer.new(current_user, @post, PostActionType.types[:like]).perform if reaction.positive?
    end

    def add_reaction_notification(reaction)
      ReactionNotification.new(reaction, current_user).create
    end

    def remove_reaction_notification(reaction)
      ReactionNotification.new(reaction, current_user).delete
    end

    def reaction_scope
      DiscourseReactions::Reaction.where(post_id: @post.id,
                                         reaction_value: params[:reaction],
                                         reaction_type:  DiscourseReactions::Reaction.reaction_types['emoji'])
    end

    def reaction_user_scope(reaction)
      return nil unless reaction
      DiscourseReactions::ReactionUser.where(reaction_id: reaction.id, user_id: current_user.id)
    end

    def post_serializer
      PostSerializer.new(@post, scope: guardian, root: false)
    end

    def fetch_post_from_params
      @post = Post.find(params[:post_id])
      guardian.ensure_can_see!(@post)
    end
  end
end
