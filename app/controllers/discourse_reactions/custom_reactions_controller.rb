# frozen_string_literal: true

module DiscourseReactions
  class CustomReactionsController < DiscourseReactionsController
    MAX_USERS_COUNT = 26

    def toggle
      post = fetch_post_from_params

      unless DiscourseReactions::Reaction.valid_reactions.include?(params[:reaction])
        return render_json_error(post)
      end

      publish_change_to_clients!(post)

      begin
        DiscourseReactions::ReactionManager.new(reaction_value: params[:reaction], user: current_user, guardian: guardian, post: post).toggle!
      rescue ActiveRecord::RecordNotUnique
        # If the user already performed this action, it's proably due to a different browser tab
        # or non-debounced clicking. We can ignore.
      end

      post.publish_change_to_clients!(:acted)

      render_json_dump(post_serializer(post).as_json)
    end

    def my_reactions
      reaction_users = DiscourseReactions::ReactionUser
        .joins(:reaction)
        .where(user_id: current_user.id)
        .where('discourse_reactions_reactions.reaction_users_count IS NOT NULL')

      if params[:before_reaction_user_id]
        reaction_users = reaction_users
          .where('discourse_reactions_reaction_users.id < ?', params[:before_reaction_user_id].to_i)
      end

      reaction_users = reaction_users
        .order(created_at: :desc)
        .limit(20)

      render_serialized(reaction_users.to_a, UserReactionSerializer)
    end

    def reactions_received
      posts = Post.joins(:topic).where(user_id: current_user.id)
      posts = guardian.filter_allowed_categories(posts)
      post_ids = posts.pluck(:id)

      reaction_users = DiscourseReactions::ReactionUser
        .joins(:reaction)
        .where(post_id: post_ids)
        .where('discourse_reactions_reactions.reaction_users_count IS NOT NULL')

      if params[:before_post_id]
        reaction_users = reaction_users
          .where('discourse_reactions_reaction_users.id < ?', params[:before_post_id].to_i)
      end

      reaction_users = reaction_users
        .order(created_at: :desc)
        .limit(20)

      render_serialized reaction_users.to_a, UserReactionSerializer
    end

    def post_reactions_users
      id = params.require(:id).to_i
      reaction_value = params[:reaction_value]
      post = Post.find_by(id: id)

      raise Discourse::InvalidParameters if !post

      reaction_users = []

      likes = post.post_actions.where('deleted_at IS NULL AND post_action_type_id = ?', PostActionType.types[:like]) if !reaction_value || reaction_value == DiscourseReactions::Reaction.main_reaction_id

      if likes.present?
        reaction_users << {
          id: DiscourseReactions::Reaction.main_reaction_id,
          count: likes.length.to_i,
          users: format_likes_users(likes)
        }
      end

      if !reaction_value
        post.reactions.select { |reaction| reaction[:reaction_users_count] }.each do |reaction|
          reaction_users << format_reaction_user(reaction)
        end
      elsif reaction_value != DiscourseReactions::Reaction.main_reaction_id
        post.reactions.where(reaction_value: reaction_value).select { |reaction| reaction[:reaction_users_count] }.each do |reaction|
          reaction_users << format_reaction_user(reaction)
        end
      end

      render_json_dump(reaction_users: reaction_users)
    end

    private

    def get_users(reaction)
      reaction.reaction_users.includes(:user).order("discourse_reactions_reaction_users.created_at desc").limit(MAX_USERS_COUNT + 1).map { |reaction_user|
        {
          username: reaction_user.user.username,
          name: reaction_user.user.name,
          avatar_template: reaction_user.user.avatar_template,
          can_undo: reaction_user.can_undo?
        }
      }
    end

    def post_serializer(post)
      PostSerializer.new(post, scope: guardian, root: false)
    end

    def publish_change_to_clients!(post)
      message = {
        id: post.id,
        type: params[:reaction]
      }
      MessageBus.publish("/post/#{post.id}", message)
    end

    private

    def format_reaction_user(reaction)
      {
        id: reaction.reaction_value,
        count: reaction.reaction_users_count.to_i,
        users: get_users(reaction)
      }
    end

    def format_like_user(like)
      {
        username: like.user.username,
        name: like.user.name,
        avatar_template: like.user.avatar_template,
        can_undo: guardian.can_delete_post_action?(like)
      }
    end

    def format_likes_users(likes)
      likes
        .includes([:user])
        .limit(MAX_USERS_COUNT + 1)
        .map { |like| format_like_user(like) }
    end

    def fetch_post_from_params
      post = Post.find(params[:post_id])
      guardian.ensure_can_see!(post)
      post
    end
  end
end
