# frozen_string_literal: true

Fabricator(:one_reaction_notification, from: :notification) do
  transient :acting_user
  notification_type Notification.types[:reaction]
  post
  topic { |attrs| attrs[:post].topic }
  data do |attrs|
    acting_user = attrs[:acting_user] || Fabricate(:user)
    {
      topic_title: attrs[:topic].title,
      original_post_id: attrs[:post].id,
      original_post_type: attrs[:post].post_type,
      original_username: acting_user.username,
      revision_number: nil,
      display_username: acting_user.username,
    }.to_json
  end
end

Fabricator(:multiple_reactions_notification, from: :one_reaction_notification) do
  transient :acting_user_2
  transient :count
  data do |attrs|
    acting_user = attrs[:acting_user] || Fabricate(:user)
    acting_user_2 = attrs[:acting_user_2] || Fabricate(:user)
    {
      topic_title: attrs[:topic].title,
      original_post_id: attrs[:post].id,
      original_post_type: attrs[:post].post_type,
      original_username: acting_user_2.username,
      revision_number: nil,
      display_username: acting_user_2.username,
      previous_notification_id: 2019,
      username2: acting_user.username,
      count: attrs[:count] || 2,
    }.to_json
  end
end
