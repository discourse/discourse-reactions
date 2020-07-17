# frozen_string_literal: true

require 'rails_helper'
require_relative '../fabricators/reaction_fabricator.rb'
require_relative '../fabricators/reaction_user_fabricator.rb'

describe TopicViewSerializer do
  fab!(:user_1) { Fabricate(:user) }
  fab!(:user_2) { Fabricate(:user) }
  fab!(:post_1) { Fabricate(:post, user: user_1) }
  fab!(:post_2) { Fabricate(:post, user: user_1, topic: post_1.topic) }
  fab!(:thumbsdown) { Fabricate(:reaction, post: post_1, reaction_value: 'otter') }
  fab!(:reaction_user1) { Fabricate(:reaction_user, reaction: thumbsdown, user: user_1) }
  fab!(:like_1) { Fabricate(:post_action, post: post_1, user: user_1, post_action_type_id: PostActionType.types[:like]) }
  fab!(:like_2) { Fabricate(:post_action, post: post_1, user: user_2, post_action_type_id: PostActionType.types[:like]) }
  let(:topic) { post_1.topic }
  let(:topic_view) { TopicView.new(topic) }

  it 'shows valid reactions and user reactions' do
    SiteSetting.discourse_reactions_like_icon = "heart"
    SiteSetting.discourse_reactions_enabled_reactions = "laughing|heart|-open_mouth|-cry|-angry|thumbsup|-thumbsdown"
    json = TopicViewSerializer.new(topic_view, scope: Guardian.new(user_1), root: false).as_json
    expect(json[:valid_reactions]).to eq(%w(laughing heart open_mouth cry angry thumbsup thumbsdown).to_set)
    expect(json[:post_stream][:posts][0][:reactions]).to eq(
      [
        {
          id: "otter",
          type: :emoji,
          users: [
            { username: user_1.username, avatar_template: user_1.avatar_template, can_undo: true }
          ],
          count: 1
        },
        {
          id: "heart",
          type: :emoji,
          users: [
            { username: user_1.username, avatar_template: user_1.avatar_template, can_undo: true },
            { username: user_2.username, avatar_template: user_2.avatar_template, can_undo: false }
          ],
          count: 2
        }
      ]
    )
    expect(json[:post_stream][:posts][0][:user_positively_reacted]).to eq(true)
    expect(json[:post_stream][:posts][1][:user_positively_reacted]).to eq(false)
    expect(json[:post_stream][:posts][0][:reaction_users_count]).to eq(2)
  end
end
