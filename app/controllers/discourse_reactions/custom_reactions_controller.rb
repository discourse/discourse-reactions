# frozen_string_literal: true

module DiscourseReactions
  class CustomReactionsController < DiscourseReactionsController
    def index
      post = Post.find(params[:post_id])

      guardian.ensure_can_see!(post)

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
  end
end
