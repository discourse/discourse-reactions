# frozen_string_literal: true

require 'rails_helper'
require_relative '../fabricators/reaction_fabricator.rb'
require_relative '../fabricators/reaction_user_fabricator.rb'

describe TopicViewSerializer do
  fab!(:user_1) { Fabricate(:user) }
  fab!(:post_1) { Fabricate(:post, user: user_1) }
  let(:topic) { post_1.topic }
  let(:topic_view) { TopicView.new(topic) }

  it 'shows valid reactions' do
    SiteSetting.discourse_reactions_enabled_reactions = "laughing|heart|-open_mouth|-cry|-angry|thumbsup|-thumbsdown"
    json = TopicViewSerializer.new(topic_view, scope: Guardian.new, root: false).as_json
    expect(json[:valid_reactions]).to eq(%w(laughing heart open_mouth cry angry thumbsup thumbsdown).to_set)
  end

  it 'does not duplicate when pluck' do
    reaction_1 = Fabricate(:reaction, post: post_1)
    user_2 = Fabricate(:user)
    Fabricate(:reaction_user, reaction: reaction_1, user: user_1)
    Fabricate(:reaction_user, reaction: reaction_1, user: user_2)
    expect(topic_view.posts.pluck(:id)).to eq([post_1.id])
  end
end
