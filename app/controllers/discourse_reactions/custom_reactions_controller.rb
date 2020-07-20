# frozen_string_literal: true

module DiscourseReactions
  class CustomReactionsController < DiscourseReactionsController
    before_action :fetch_post_from_params

    def toggle
      return render_json_error(@post) unless DiscourseReactions::Reaction.valid_reactions.include?(params[:reaction])
      ActiveRecord::Base.transaction do
        if params[:reaction] == SiteSetting.discourse_reactions_like_icon
          like =  @post.post_actions.find_by(user: current_user, post_action_type_id: PostActionType.types[:like])
          if like && !guardian.can_delete_post_action?(like)
            return render json: failed_json.merge(errors: I18n.t("invalid_access")), status: 400
          end
          like ? remove_shadow_like : add_shadow_like
        else
          PostAction.limit_action!(current_user, @post, post_action_like_type)
          reaction = reaction_scope.first_or_create
          reaction_user = reaction_user_scope(reaction)&.first_or_initialize
          if reaction_user.persisted?
            unless guardian.can_delete_reaction_user?(reaction_user)
              return render json: failed_json.merge(errors: I18n.t("invalid_access")), status: 400
            end
            reaction_user.destroy
            remove_reaction_notification(reaction)
          else
            reaction_user.save!
            add_reaction_notification(reaction)
          end
          reaction.destroy if reaction.reload.reaction_users_count == 0
        end
      end

      @post.publish_change_to_clients! :acted

      render_json_dump(post_serializer.as_json)
    end

    private

    def post_action_like_type
      PostActionType.types[:like]
    end

    def add_shadow_like
      PostActionCreator.like(current_user, @post)
    end

    def remove_shadow_like
      PostActionDestroyer.new(current_user, @post, post_action_like_type).perform
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
                                         reaction_type: DiscourseReactions::Reaction.reaction_types['emoji'])
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
