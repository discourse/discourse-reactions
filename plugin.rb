# frozen_string_literal: true

# name: discourse-reactions
# about: Allows users to react with emojis to a post
# version: 0.1
# author: Ahmed Gagan, Rafael dos Santos Silva, Kris Aubuchon, Joffrey Jaffeux, Kris Kotlarek, Jordan Vidrine
# url: https://github.com/discourse/discourse-reactions

enabled_site_setting :discourse_reactions_enabled

register_asset 'stylesheets/common/discourse-reactions.scss'
register_asset 'stylesheets/desktop/discourse-reactions.scss', :desktop
register_asset 'stylesheets/mobile/discourse-reactions.scss', :mobile

register_svg_icon 'fas fa-star'
register_svg_icon 'far fa-star'

MAX_USERS_COUNT = 26

after_initialize do
  SeedFu.fixture_paths << Rails.root.join("plugins", "discourse-reactions", "db", "fixtures").to_s

  module ::DiscourseReactions
    PLUGIN_NAME ||= 'discourse-reactions'

    class Engine < ::Rails::Engine
      engine_name PLUGIN_NAME
      isolate_namespace DiscourseReactions
    end
  end

  [
    "../app/serializers/user_reaction_serializer.rb",
    "../app/controllers/discourse_reactions_controller.rb",
    "../app/controllers/discourse_reactions/custom_reactions_controller.rb",
    "../app/models/discourse_reactions/reaction.rb",
    "../app/models/discourse_reactions/reaction_user.rb",
    "../app/services/discourse_reactions/reaction_manager.rb",
    "../app/services/discourse_reactions/reaction_notification.rb",
    "../lib/discourse_reactions/post_extension.rb",
    "../lib/discourse_reactions/topic_view_serializer_extension.rb",
    "../lib/discourse_reactions/notification_extension.rb",
    "../lib/discourse_reactions/post_alerter_extension.rb",
    "../lib/discourse_reactions/guardian_extension.rb"
  ].each { |path| load File.expand_path(path, __FILE__) }

  reloadable_patch do |plugin|
    Post.class_eval { prepend DiscourseReactions::PostExtension }
    TopicViewSerializer.class_eval { prepend DiscourseReactions::TopicViewSerializerExtension }
    PostAlerter.class_eval { prepend DiscourseReactions::PostAlerterExtension }
    Guardian.class_eval { prepend DiscourseReactions::GuardianExtension }
    Notification.singleton_class.class_eval { prepend DiscourseReactions::NotificationExtension }
  end

  Discourse::Application.routes.append do
    mount ::DiscourseReactions::Engine, at: '/'
  end

  ::ActionController::Base.prepend_view_path File.expand_path('../app/views', __FILE__)

  DiscourseReactions::Engine.routes.draw do
    get "/discourse-reactions/custom-reactions" => "custom_reactions#index", constraints: { format: :json }
    put "/discourse-reactions/posts/:post_id/custom-reactions/:reaction/toggle" => "custom_reactions#toggle", constraints: { format: :json }
    get "/discourse-reactions/posts/my-reactions" => "custom_reactions#my_reactions", as: "my_reactions"
    get "/discourse-reactions/posts/reactions-received" => "custom_reactions#reactions_received", as: "reactions_received"
    get "/discourse-reactions/posts/:id/reactions-users" => "custom_reactions#post_reactions_users", as: "post_reactions_users"
  end

  add_to_serializer(:post, :reactions) do
    reactions = object.reactions.select { |reaction| reaction[:reaction_users_count] }.map do |reaction|
      {
        id: reaction.reaction_value,
        type: reaction.reaction_type.to_sym,
        count: reaction.reaction_users_count
      }
    end

    likes = object.post_actions.where("deleted_at IS NULL AND post_action_type_id = ?", PostActionType.types[:like])

    object.post_actions

    return reactions.sort_by { |reaction| [-reaction[:count].to_i, reaction[:id]] } if likes.blank?

    like_reaction = {
      id: DiscourseReactions::Reaction.main_reaction_id,
      type: :emoji,
      count: likes.length
    }

    reactions << like_reaction

    reactions.sort_by { |reaction| [-reaction[:count].to_i, reaction[:id]] }
  end

  add_to_serializer(:post, :current_user_reaction) do
    return nil unless scope.user.present?
    object.reactions.includes([:reaction_users]).each do |reaction|
      reaction_user = reaction.reaction_users.find { |ru| ru.user_id == scope.user.id }

      next unless reaction_user

      return {
        id: reaction.reaction_value,
        type: reaction.reaction_type.to_sym,
        can_undo: reaction_user.can_undo?
      } if reaction.reaction_users_count
    end

    like = object.post_actions.find do |l|
      l.post_action_type_id == PostActionType.types[:like] &&
      l.deleted_at.blank? &&
      l.user_id == scope.user.id
    end

    return nil if like.blank?

    like_reaction = {
      id: DiscourseReactions::Reaction.main_reaction_id,
      type: :emoji,
      can_undo: scope.can_delete_post_action?(like)
    }
  end

  add_to_serializer(:post, :reaction_users_count) do
    return object.reaction_users_count unless object.reaction_users_count.nil?
    TopicViewSerializer.posts_reaction_users_count(object.id)[object.id]
  end

  add_to_serializer(:post, :current_user_used_main_reaction) do
    return false unless scope.user.present?

    object.post_actions.any? do |l|
      l.post_action_type_id == PostActionType.types[:like] &&
      l.user_id == scope.user.id &&
      l.deleted_at.blank?
    end
  end

  add_to_serializer(:topic_view, :valid_reactions) do
    DiscourseReactions::Reaction.valid_reactions
  end

  add_model_callback(User, :before_destroy) do
    DiscourseReactions::ReactionUser.where(user_id: self.id).delete_all
  end
end
