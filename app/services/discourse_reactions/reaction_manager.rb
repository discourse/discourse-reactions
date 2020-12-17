# frozen_string_literal: true

module DiscourseReactions
  class ReactionManager
    def initialize(reaction_value:, user:, guardian:, post:)
      @reaction_value = reaction_value
      @user = user
      @guardian = guardian
      @post = post
      @reaction = reaction_scope.first_or_create
      @like = @post.post_actions.find_by(user: @user, post_action_type_id: post_action_like_type)
    end

    def toggle!
      ActiveRecord::Base.transaction do
        @reaction_value == DiscourseReactions::Reaction.main_reaction_id ? toggle_like : toggle_reaction
      end
    end

    private

    def toggle_like
      raise Discourse::InvalidAccess if @like && !@guardian.can_delete_post_action?(like)
      remove_shadow_like if @like
      remove_reaction if is_reacted_by_user
      add_shadow_like unless @like
    end

    def toggle_reaction
      PostAction.limit_action!(@user, @post, post_action_like_type)
      remove_reaction if is_reacted_by_user
      remove_shadow_like if @like
      add_reaction unless is_reacted_by_user
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
      DiscourseReactions::ReactionUser.where(reaction_id: @reaction.id, user_id: @user.id, post_id: @post.id)
    end

    def is_reacted_by_user
      DiscourseReactions::ReactionUser.find_by(user_id: @user.id, post_id: @post.id) ? true : false
    end

    def add_shadow_like
      PostActionCreator.like(@user, @post)
    end

    def remove_shadow_like
      PostActionDestroyer.new(@user, @post, post_action_like_type).perform
    end

    def add_reaction
      add_reaction_user
      add_reaction_notification
    end

    def remove_reaction
      remove_reaction_user
      remove_reaction_notification
      @reaction.destroy if @reaction.reload.reaction_users_count == 0
    end

    def add_reaction_user
      return nil unless @reaction
      DiscourseReactions::ReactionUser.where(reaction_id: @reaction.id, user_id: @user.id, post_id: @post.id)&.first_or_initialize.save!
    end

    def remove_reaction_user
      DiscourseReactions::ReactionUser.find_by(user_id: @user.id, post_id: @post.id).destroy
    end
  end
end
