# frozen_string_literal: true

module DiscourseReactions
  class ReactionManager
    def initialize(reaction_value:, user:, guardian:, post:)
      @reaction_value = reaction_value
      @user = user
      @guardian = guardian
      @post = post
    end

    def toggle!
      ActiveRecord::Base.transaction do
        @reaction_value == DiscourseReactions::Reaction.main_reaction_id ? toggle_like : toggle_reaction
      end
    end

    private

    def toggle_like
      like = @post.post_actions.find_by(user: @user, post_action_type_id: post_action_like_type)
      raise Discourse::InvalidAccess if like && !@guardian.can_delete_post_action?(like)
      like ? remove_shadow_like : add_shadow_like
    end

    def toggle_reaction
      PostAction.limit_action!(@user, @post, post_action_like_type)
      @reaction = reaction_scope.first_or_create
      @reaction_user = reaction_user_scope&.first_or_initialize
      @reaction_user.persisted? ? remove_reaction : add_reaction
    end

    def post_action_like_type
      PostActionType.types[:like]
    end

    def add_reaction_notification
      DiscourseReactions::ReactionNotification.new(@reaction, @user).create
    end

    def remove_reaction_notification
      DiscourseReactions::ReactionNotification.new(@reaction, @user).delete
    end

    def reaction_scope
      DiscourseReactions::Reaction.where(post_id: @post.id,
                                         reaction_value: @reaction_value,
                                         reaction_type: DiscourseReactions::Reaction.reaction_types['emoji'])
    end

    def reaction_user_scope
      return nil unless @reaction
      DiscourseReactions::ReactionUser.where(reaction_id: @reaction.id, user_id: @user.id)
    end

    def add_shadow_like
      PostActionCreator.like(@user, @post)
    end

    def remove_shadow_like
      PostActionDestroyer.new(@user, @post, post_action_like_type).perform
    end

    def add_reaction
      @reaction_user.save!
      add_reaction_notification
    end

    def remove_reaction
      raise Discourse::InvalidAccess if !@guardian.can_delete_reaction_user?(@reaction_user)
      @reaction_user.destroy
      remove_reaction_notification
      @reaction.destroy if @reaction.reload.reaction_users_count == 0
    end
  end
end
