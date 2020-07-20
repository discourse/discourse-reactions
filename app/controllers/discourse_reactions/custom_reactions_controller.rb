# frozen_string_literal: true

module DiscourseReactions
  class CustomReactionsController < DiscourseReactionsController
    before_action :fetch_post_from_params

    def toggle
      return render_json_error(@post) unless DiscourseReactions::Reaction.valid_reactions.include?(params[:reaction])

      DiscourseReactions::ReactionManager.toggle!(params[:reaction], current_user, guardian, @post)

      @post.publish_change_to_clients! :acted

      render_json_dump(post_serializer.as_json)
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
