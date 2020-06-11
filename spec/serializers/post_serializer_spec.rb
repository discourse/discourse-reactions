# frozen_string_literal: true

require 'rails_helper'
require_relative '../fabricators/reaction_fabricator.rb'


describe PostSerializer do
  fab!(:user_1) { Fabricate(:user) }
  fab!(:user_2) { Fabricate(:user) }
  fab!(:post_1) { Fabricate(:post, user: user_1) }
  fab!(:reaction_1) { Fabricate(:reaction, post: post_1, user: user_1) }
  fab!(:reaction_2) { Fabricate(:reaction, post: post_1, user: user_2) }
  fab!(:reaction_3) { Fabricate(:reaction, reaction_value: "thumbs-up", post: post_1, user: user_2) }

  it 'renders custom reactions' do
    json = PostSerializer.new(post_1, scope: Guardian.new(user_1), root: false).as_json
    expect(json[:reactions]).to eq([
      {
        id: 'otter',
        type: :emoji,
        users: [
          { username: user_1.username, avatar_template: user_1.avatar_template },
          { username: user_2.username, avatar_template: user_2.avatar_template }
        ],
        count: 2
      },
      {
        id: 'thumbs-up',
        type: :emoji,
        users: [
          { username: user_2.username, avatar_template: user_2.avatar_template }
        ],
        count: 1
      }
    ])
  end

  context 'disabled' do
    it 'is not extending post serializer when plugin is disabled' do
      SiteSetting.discourse_reactions_enabled = false
      json = PostSerializer.new(post_1, scope: Guardian.new(user_1), root: false).as_json
      expect(json[:reactions]).to be nil
    end
  end
end
