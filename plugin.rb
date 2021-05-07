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

require_relative 'lib/reaction_for_like_site_setting_enum'

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

    likes = object.post_actions.where('deleted_at IS NULL AND post_action_type_id = ?', PostActionType.types[:like])

    if likes.blank?
      return reactions.sort_by { |reaction| [-reaction[:count].to_i, reaction[:id]] }
    end

    reaction_likes, reactions = reactions.partition { |r| r[:id] == DiscourseReactions::Reaction.main_reaction_id }

    reactions << {
      id: DiscourseReactions::Reaction.main_reaction_id,
      type: :emoji,
      count: likes.size + reaction_likes.sum { |r| r[:count] }
    }

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

  add_report('reactions') do |report|
    main_id = DiscourseReactions::Reaction.main_reaction_id
    count_relation = ->(relation, start_date) {
      relation
        .where('created_at >= ?', start_date)
        .where('created_at <= ?', start_date + 1.day)
        .count
    }

    report.icon = 'emoji-icon'
    report.modes = [:table]

    report.data = []

    report.labels = [
      {
        type: :date,
        property: :day,
        title: I18n.t('reports.reactions.labels.day')
      },
      {
        type: :number,
        property: :like_count,
        html_title: PrettyText.unescape_emoji(CGI::escapeHTML(":#{main_id}:"))
      }
    ]

    reactions = SiteSetting.discourse_reactions_enabled_reactions.split("|")

    reactions.each do |reaction|
      report.labels << {
        type: :number,
        property: "#{reaction}_count",
        html_title: PrettyText.unescape_emoji(CGI::escapeHTML(":#{reaction}:"))
      }
    end

    reactions_results = DB.query(<<~SQL, start_date: report.start_date.to_date, end_date: report.end_date.to_date)
      SELECT
        drr.reaction_value,
        count(drru.id) as reactions_count,
        date_trunc('day', drru.created_at)::date as day
      FROM discourse_reactions_reactions as drr
      LEFT OUTER JOIN discourse_reactions_reaction_users as drru on drr.id = drru.reaction_id
      WHERE drr.reaction_users_count IS NOT NULL
        AND drru.created_at >= :start_date::DATE AND drru.created_at <= :end_date::DATE
      GROUP BY drr.reaction_value, day
    SQL

    likes_results = DB.query(<<~SQL, start_date: report.start_date.to_date, end_date: report.end_date.to_date)
      SELECT
        count(pa.id) as likes_count,
        date_trunc('day', pa.created_at)::date as day
      FROM post_actions as pa
      WHERE pa.created_at >= :start_date::DATE AND pa.created_at <= :end_date::DATE
      GROUP BY day
    SQL

    (report.start_date.to_date..report.end_date.to_date).each do |date|
      data = { 'day' => date }

      like_count = 0
      like_reaction_count = 0
      likes_results.select { |r|  r.day == date  }.each do |result|
        like_count += result.likes_count
      end

      reactions_results.select { |r| r.day == date }.each do |result|
        if result.reaction_value == main_id
          like_reaction_count += result.reactions_count
        else
          data["#{result.reaction_value}_count"] ||= 0
          data["#{result.reaction_value}_count"] += result.reactions_count
        end
      end

      data['like_count'] = like_reaction_count + like_count

      report.data << data
    end
  end
end
