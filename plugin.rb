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
    "../lib/discourse_reactions/post_extension.rb",
    "../lib/discourse_reactions/topic_view_extension.rb"
  ].each { |path| load File.expand_path(path, __FILE__) }

  reloadable_patch do |plugin|
    Post.class_eval { prepend DiscourseReactions::PostExtension }
    TopicView.class_eval { prepend DiscourseReactions::TopicViewExtension }
  end

  Discourse::Application.routes.append do
    mount ::DiscourseReactions::Engine, at: '/'
  end

  DiscourseReactions::Engine.routes.draw do
    get '/discourse-reactions/custom-reactions' => 'custom_reactions#index', constraints: { format: :json }
  end

  add_to_serializer(:post, :reactions) do
    return false unless SiteSetting.discourse_reactions_enabled
    object.reactions.each_with_object({}) do |reaction, result|
      key = reaction.reaction_value
      result[key] = {
        id: key,
        type: reaction.reaction_type.to_sym,
        users: (result.dig(key, :users) || []) << { username: reaction.user.username, avatar_template: reaction.user.avatar_template },
        count: result.dig(key, :count).to_i + 1
      }
    end.values
  end
end
