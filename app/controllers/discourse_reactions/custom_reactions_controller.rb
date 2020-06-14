# frozen_string_literal: true

module DiscourseReactions
  class CustomReactionsController < DiscourseReactionsController
    before_action :fetch_post_from_params

    def index
      user = User.last

      reactions = [
        {
          id: 'otter',
          type: :emoji,
          users: [
            { username: user.username, avatar_template: user.avatar_template }
          ],
          count: 1
        },
        {
          id: 'thumbsup',
          type: :emoji,
          users: [
            { username: user.username, avatar_template: user.avatar_template },
            { username: current_user.username, avatar_template: current_user.avatar_template },
          ],
          count: 2
        }
      ]

      render json: reactions
    end

    def create
      return render_json_error(@post) unless DiscourseReactions::Reaction.valid_reactions.include?(params[:reaction])
      reaction_scope.first_or_create!
      add_or_remove_shadow_like
      render_json_dump(post_serializer.as_json)
    end

    def destroy
      reaction_scope.delete_all
      render_json_dump(post_serializer.as_json)
    end

    private 

    def add_or_remove_shadow_like
      # TODO add like when positive emoji exists and like was not already given
      # TODO remove like when all positive emojis are removed for specific user and post
    end

    def reaction_scope
      DiscourseReactions::Reaction.where(post_id: @post.id,
                                         user_id: current_user.id,
                                         reaction_value: params[:reaction],
                                         reaction_type:  DiscourseReactions::Reaction.reaction_types['emoji'])
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
