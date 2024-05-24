#!/usr/bin/env ruby

unless ENV["USER"] == "discourse"
  fullpath = File.expand_path(__FILE__)
  exec "/bin/bash -c 'cd /var/www/discourse && RAILS_ENV=production sudo -H -E -u discourse #{fullpath}'"
end

require "/var/www/discourse/config/environment"

report = []
RailsMultisite::ConnectionManagement.each_connection do
  db = RailsMultisite::ConnectionManagement.current_db
  sync_enabled = SiteSetting.discourse_reactions_like_sync_enabled
  total_reactions = DiscourseReactions::ReactionUser.count
  reactions_not_denied =
    DiscourseReactions::ReactionUser
      .joins(:reaction)
      .where.not(
        discourse_reactions_reactions: {
          reaction_value: SiteSetting.discourse_reactions_excluded_from_like,
        },
      )
      .count
  total_likes = PostAction.where(post_action_type_id: PostActionType.types[:like]).count

  if total_reactions > 0
    report << { db:, sync_enabled:, total_reactions:, reactions_not_denied:, total_likes: }
  end
end
report.sort_by! { |r| r[:total_reactions] }.reverse!

puts "db,sync enabled,reactions total,reactions not denied,likes total"
report.each do |r|
  puts "#{r[:db]},#{r[:sync_enabled]},#{r[:total_reactions]},#{r[:reactions_not_denied]},#{r[:total_likes]}"
end
