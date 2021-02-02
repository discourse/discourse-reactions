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

    def reactions_given
      user = User.find_by_username_lower(params[:username])
      posts = Post.joins(reactions_user: :reaction)
        .where("discourse_reactions_reaction_users.user_id = ?", user.id)
        .where("discourse_reactions_reactions.reaction_users_count IS NOT NULL")

      posts = guardian.filter_allowed_categories(posts)
      posts = posts.where('discourse_reactions_reaction_users.id < ?', params[:before_post_id].to_i) if params[:before_post_id]
      posts = posts.order('discourse_reactions_reaction_users.created_at desc').limit(20)

      render_serialized posts.to_a, UserReactionSerializer
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
