module DiscourseReactions
  module UserActionsControllerExtension
    extend ActiveSupport::Concern

    def reactions_recieved_posts
      return if !SiteSetting.discourse_reactions_enabled

      params.require(:username)
      user =
        fetch_user_from_params(
          include_inactive:
            current_user.try(:staff?) || (current_user && SiteSetting.show_inactive_accounts),
        )
      raise Discourse::NotFound unless guardian.can_see_profile?(user)

      reaction_posts =
        Post
          .joins(
            "INNER JOIN discourse_reactions_reaction_users drru ON posts.id = drru.post_id AND posts.deleted_at IS NULL",
          )
          .joins("INNER JOIN discourse_reactions_reactions drr ON drr.id = drru.reaction_id")
          .joins("INNER JOIN topics t ON t.id = posts.topic_id AND t.deleted_at IS NULL")
          .includes(user: %i[uploaded_avatar user_avatar])
          .includes(:topic, :reactions)
          .where(drru: { user_id: user.id })
          .where("drr.reaction_users_count IS NOT NULL")
          .order(created_at: :desc)

      reaction_posts = reaction_posts.order(created_at: :desc).limit(20)

      # puts render_serialized(reaction_posts.to_a, PostSerializer)

      render_serialized(reaction_posts.to_a, PostSerializer, scope: guardian, add_excerpt: true)

      # DiscourseReactions::ReactionUser
      #   .joins(
      #     "INNER JOIN discourse_reactions_reactions ON discourse_reactions_reactions.id = discourse_reactions_reaction_users.reaction_id",
      #   )
      #   .joins(
      #     "INNER JOIN posts p ON p.id = discourse_reactions_reaction_users.post_id AND p.deleted_at IS NULL",
      #   )
      #   .joins("INNER JOIN topics t ON t.id = p.topic_id AND t.deleted_at IS NULL")
      #   .joins(
      #     "INNER JOIN posts p2 ON p2.topic_id = t.id AND p2.post_number = 1 AND p.deleted_at IS NULL",
      #   )
      #   .joins("LEFT JOIN categories c ON c.id = t.category_id")
      #   .includes(:user, :post, :reaction)
      #   .where(user_id: user.id)
      #   .where("discourse_reactions_reactions.reaction_users_count IS NOT NULL")
    end
  end
end
