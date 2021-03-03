# frozen_string_literal: true

module DiscourseReactions
  class CustomReactionsController < DiscourseReactionsController
    MAX_USERS_COUNT = 26

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

    def post_reactions_users
      post_id = params.require(:post_id).to_i
      reaction_value = params[:reaction_value]

      post = Post.find_by(id: post_id)

      raise Discourse::InvalidParameters if !post || (reaction_value && !DiscourseReactions::Reaction.valid_reactions.include?(reaction_value))

      reaction_users = {}

      if reaction_value && reaction_value == DiscourseReactions::Reaction.main_reaction_id
        likes = post.post_actions.where("deleted_at IS NULL AND post_action_type_id = ?", PostActionType.types[:like])

        if !likes.blank?
          reaction_users[DiscourseReactions::Reaction.main_reaction_id] = {
            users: likes.includes([:user]).map { |like| { username: like.user.username, name: like.user.name, avatar_template: like.user.avatar_template, can_undo: guardian.can_delete_post_action?(like) } },
          }
        end
      elsif reaction_value
        post.reactions.where(reaction_value: reaction_value).select { |reaction| reaction[:reaction_users_count] }.each do |reaction|
          reaction_users[reaction.reaction_value] = {
            users: reaction.reaction_users.includes(:user).order("discourse_reactions_reaction_users.created_at desc").limit(MAX_USERS_COUNT + 1).map { |reaction_user| { username: reaction_user.user.username, name: reaction_user.user.name, avatar_template: reaction_user.user.avatar_template, can_undo: reaction_user.can_undo? } }
          }
        end
      else
        post.reactions.select { |reaction| reaction[:reaction_users_count] }.each do |reaction|
          reaction_users[reaction.reaction_value] = {
            users: reaction.reaction_users.includes(:user).order("discourse_reactions_reaction_users.created_at desc").limit(MAX_USERS_COUNT + 1).map { |reaction_user| { username: reaction_user.user.username, name: reaction_user.user.name, avatar_template: reaction_user.user.avatar_template, can_undo: reaction_user.can_undo? } }
          }
        end

        likes = post.post_actions.where("deleted_at IS NULL AND post_action_type_id = ?", PostActionType.types[:like])

        if !likes.blank?
          reaction_users[DiscourseReactions::Reaction.main_reaction_id] = {
            users: likes.includes([:user]).map { |like| { username: like.user.username, name: like.user.name, avatar_template: like.user.avatar_template, can_undo: guardian.can_delete_post_action?(like) } },
          }
        end
      end

      render_json_dump(reaction_users: reaction_users)
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
