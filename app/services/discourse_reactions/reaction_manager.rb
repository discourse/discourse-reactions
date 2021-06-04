# frozen_string_literal: true

module DiscourseReactions
  class ReactionManager
    def initialize(reaction_value:, user:, guardian:, post:)
      @reaction_value = reaction_value
      @user = user
      @guardian = guardian
      @post = post
      @like = @post.post_actions.find_by(user: @user, post_action_type_id: post_action_like_type)
    end

    def toggle!
      if (@like && !@guardian.can_delete_post_action?(@like)) || (reaction_user && !@guardian.can_delete_reaction_user?(reaction_user))
        raise Discourse::InvalidAccess
      end

      ActiveRecord::Base.transaction do
        @reaction = reaction_scope&.first_or_create
        @reaction_user = reaction_user_scope
        @reaction_value == DiscourseReactions::Reaction.main_reaction_id ? toggle_like : toggle_reaction
      end
    end

    private

    def toggle_like
      remove_shadow_like if @like
      remove_reaction if reaction_user
      add_shadow_like unless @like
    end

    def toggle_reaction
      previous_reaction = old_reaction(reaction_user) if reaction_user
      remove_reaction if reaction_user
      return if previous_reaction && previous_reaction.reaction_value == @reaction_value
      remove_shadow_like if @like
      add_reaction unless reaction_user
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
      search_reaction_user = DiscourseReactions::ReactionUser.where(user_id: @user.id, post_id: @post.id)
      create_reaction_user = DiscourseReactions::ReactionUser.new(reaction_id: @reaction.id, user_id: @user.id, post_id: @post.id)
      search_reaction_user.length > 0 ? search_reaction_user.first : create_reaction_user
    end

    def reaction_user
      DiscourseReactions::ReactionUser.find_by(user_id: @user.id, post_id: @post.id)
    end

    def old_reaction(reaction_user)
      return unless reaction_user
      DiscourseReactions::Reaction.where(id: reaction_user.reaction_id).first
    end

    def add_shadow_like
      PostActionCreator.like(@user, @post)
    end

    def remove_shadow_like
      PostActionDestroyer.new(@user, @post, post_action_like_type).perform
      delete_like_reaction
    end

    def delete_like_reaction
      DiscourseReactions::Reaction.where("reaction_value = '#{DiscourseReactions::Reaction.main_reaction_id}' AND post_id = ?", @post.id).destroy_all
    end

    def add_reaction
      @reaction_user = reaction_user_scope unless reaction_user
      @reaction_user.save!
      add_reaction_notification
    end

    def remove_reaction
      @reaction_user.destroy
      remove_reaction_notification
      delete_reaction
    end

    def delete_reaction
      DiscourseReactions::Reaction.where("reaction_users_count = 0 AND post_id = ?", @post.id).destroy_all
    end

  end
end
