# frozen_string_literal: true

module DiscourseReactions
  class CustomReactionsController < DiscourseReactionsController
    def toggle
      fetch_post_from_params
      return render_json_error(@post) unless DiscourseReactions::Reaction.valid_reactions.include?(params[:reaction])

      DiscourseReactions::ReactionManager.new(reaction_value: params[:reaction], user: current_user, guardian: guardian, post: @post).toggle!

      @post.publish_change_to_clients! :acted

      render_json_dump(post_serializer.as_json)
    end

    def my_reactions
      reaction_users = DiscourseReactions::ReactionUser.joins(:reaction)
        .where(user_id: current_user.id)
        .where("discourse_reactions_reactions.reaction_users_count IS NOT NULL")

      reaction_users = reaction_users.where('discourse_reactions_reaction_users.id < ?', params[:before_reaction_user_id].to_i) if params[:before_reaction_user_id]
      reaction_users = reaction_users.order(created_at: :desc).limit(20)

      render_serialized reaction_users.to_a, UserReactionSerializer
    end

    def reactions_received
      posts = Post.joins(:topic).where(user_id: current_user.id)
      posts = guardian.filter_allowed_categories(posts)
      post_ids = posts.pluck(:id)

      reaction_users = DiscourseReactions::ReactionUser.joins(:reaction)
        .where(post_id: post_ids)
        .where("discourse_reactions_reactions.reaction_users_count IS NOT NULL")

      reaction_users = reaction_users.where('discourse_reactions_reaction_users.id < ?', params[:before_post_id].to_i) if params[:before_post_id]
      reaction_users = reaction_users.order(created_at: :desc).limit(20)

      render_serialized reaction_users.to_a, UserReactionSerializer
    end

    private

    def post_serializer
      PostSerializer.new(@post, scope: guardian, root: false)
    end

    def fetch_post_from_params
      @post = Post.find(params[:post_id])
      guardian.ensure_can_see!(@post)
    end
  end
end
