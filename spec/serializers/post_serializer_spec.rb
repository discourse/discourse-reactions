# frozen_string_literal: true

require 'rails_helper'
require_relative '../fabricators/reaction_fabricator.rb'
require_relative '../fabricators/reaction_user_fabricator.rb'


describe PostSerializer do
  fab!(:user_1) { Fabricate(:user) }
  fab!(:user_2) { Fabricate(:user) }
  fab!(:user_3) { Fabricate(:user) }
  fab!(:post_1) { Fabricate(:post, user: user_1) }
  fab!(:reaction_1) { Fabricate(:reaction, post: post_1) }
  fab!(:reaction_user_1) { Fabricate(:reaction_user, reaction: reaction_1, user: user_1) }
  fab!(:reaction_user_2) { Fabricate(:reaction_user, reaction: reaction_1, user: user_2) }
  fab!(:reaction_2) { Fabricate(:reaction, reaction_value: "thumbsup", post: post_1) }
  fab!(:reaction_user_3) { Fabricate(:reaction_user, reaction: reaction_2, user: user_2, created_at: 20.minutes.ago) }
  fab!(:reaction_3) { Fabricate(:reaction, reaction_value: "heart", post: post_1) }
  fab!(:reaction_user_4) { Fabricate(:reaction_user, reaction: reaction_3, user: user_3) }

  before do
    SiteSetting.post_undo_action_window_mins = 10
    SiteSetting.discourse_reactions_enabled_reactions = '-otter|thumbsup'
    SiteSetting.discourse_reactions_like_icon = 'heart'
  end

  it 'renders custom reactions' do
    json = PostSerializer.new(post_1, scope: Guardian.new(user_1), root: false).as_json

    expect(json[:reactions]).to eq([
      {
        id: 'otter',
        type: :emoji,
        users: [
          { username: user_1.username, avatar_template: user_1.avatar_template, can_undo: true },
          { username: user_2.username, avatar_template: user_2.avatar_template, can_undo: true }
        ],
        count: 2
      },
      {
        id: 'thumbsup',
        type: :emoji,
        users: [
          { username: user_2.username, avatar_template: user_2.avatar_template, can_undo: false }
        ],
        count: 1
      },
      {
        id: 'heart',
        type: :emoji,
        users: [
          { username: user_3.username, avatar_template: user_3.avatar_template, can_undo: true }
        ],
        count: 1
      }
    ])
    expect(json[:user_positively_reacted]).to eq(false)

    json = PostSerializer.new(post_1, scope: Guardian.new(user_2), root: false).as_json
    expect(json[:user_positively_reacted]).to eq(true)

    json = PostSerializer.new(post_1, scope: Guardian.new(user_3), root: false).as_json
    expect(json[:user_positively_reacted]).to eq(true)

    expect(json[:reaction_users_count]).to eq(3)
  end

  context 'disabled' do
    it 'is not extending post serializer when plugin is disabled' do
      SiteSetting.discourse_reactions_enabled = false
      json = PostSerializer.new(post_1, scope: Guardian.new(user_1), root: false).as_json
      expect(json[:reactions]).to be nil
    end
  end
end
