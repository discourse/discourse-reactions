# frozen_string_literal: true

module DiscourseReactions
  class ReactionManager
    class << self
      def toggle!(reaction, user, guardian, post)
        ActiveRecord::Base.transaction do
          if reaction == SiteSetting.discourse_reactions_like_icon
            like = post.post_actions.find_by(user: user, post_action_type_id: PostActionType.types[:like])
            if like && !guardian.can_delete_post_action?(like)
              raise Discourse::InvalidAccess
            end
            like ? remove_shadow_like(user, post) : add_shadow_like(user, post)
          else
            PostAction.limit_action!(user, post, PostActionType.types[:like])
            reaction = reaction_scope(post, reaction).first_or_create
            reaction_user = reaction_user_scope(reaction, user)&.first_or_initialize
            if reaction_user.persisted?
              unless guardian.can_delete_reaction_user?(reaction_user)
                raise Discourse::InvalidAccess
              end
              reaction_user.destroy
              remove_reaction_notification(user, reaction)
            else
              reaction_user.save!
              add_reaction_notification(user, reaction)
            end
            reaction.destroy if reaction.reload.reaction_users_count == 0
          end
        end
      end

      private

      def add_reaction_notification(user, reaction)
        DiscourseReactions::ReactionNotification.new(reaction, user).create
      end

      def remove_reaction_notification(user, reaction)
        DiscourseReactions::ReactionNotification.new(reaction, user).delete
      end

      def reaction_scope(post, reaction)
        DiscourseReactions::Reaction.where(post_id: post.id,
                                           reaction_value: reaction,
                                           reaction_type: DiscourseReactions::Reaction.reaction_types['emoji'])
      end

      def reaction_user_scope(reaction, user)
        return nil unless reaction
        DiscourseReactions::ReactionUser.where(reaction_id: reaction.id, user_id: user.id)
      end

      def add_shadow_like(user, post)
        PostActionCreator.like(user, post)
      end

      def remove_shadow_like(user, post)
        PostActionDestroyer.new(user, post, PostActionType.types[:like]).perform
      end
    end
  end
end
