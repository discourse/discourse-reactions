# frozen_string_literal: true

# name: discourse-reactions
# about: Allows users to react with emojis to a post
# version: 0.1
# author: Rafael dos Santos Silva, Kris Aubuchon, Joffrey Jaffeux, Kris Kotlarek, Jordan Vidrine
# url: https://github.com/discourse/discourse-reactions

enabled_site_setting :discourse_reactions_enabled

register_asset 'stylesheets/common/discourse-reactions.scss'
register_asset 'stylesheets/desktop/discourse-reactions.scss'
register_asset 'stylesheets/mobile/discourse-reactions.scss'

register_svg_icon 'fas fa-star'
register_svg_icon 'far fa-star'

after_initialize do
  module ::DiscourseReactions
    PLUGIN_NAME ||= 'discourse-reactions'

    class Engine < ::Rails::Engine
      engine_name PLUGIN_NAME
      isolate_namespace DiscourseReactions
    end
  end

  [
    "../app/controllers/discourse_reactions_controller.rb",
    "../app/controllers/discourse_reactions/custom_reactions_controller.rb",
    "../app/models/discourse_reactions/reaction.rb",
    "../app/models/discourse_reactions/reaction_user.rb",
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

  DiscourseReactions::Engine.routes.draw do
    get '/discourse-reactions/custom-reactions' => 'custom_reactions#index', constraints: { format: :json }
    put '/discourse-reactions/posts/:post_id/custom-reactions/:reaction/toggle' => 'custom_reactions#toggle', constraints: { format: :json }
  end

  add_to_serializer(:post, :reactions) do
    object.reactions.map do |reaction|
      {
        id: reaction.reaction_value,
        type: reaction.reaction_type.to_sym,
        users: reaction.reaction_users.map { |reaction_user| { username: reaction_user.username, avatar_template: reaction_user.avatar_template, can_undo: reaction_user.can_undo? } },
        count: reaction.reaction_users_count
      }
    end
  end

  add_to_serializer(:topic_view, :valid_reactions) do
    DiscourseReactions::Reaction.valid_reactions
  end
end
