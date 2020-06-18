# frozen_string_literal: true

require 'rails_helper'

describe TopicViewSerializer do
  fab!(:user_1) { Fabricate(:user) }
  fab!(:post_1) { Fabricate(:post, user: user_1) }
  let(:topic) { post_1.topic }
  let(:topic_view) { TopicView.new(topic) }

  it 'shows valid reactions' do
    SiteSetting.discourse_reactions_enabled_reactions = "laughing|heart|-open_mouth|-cry|-angry|thumbsup|-thumbsdown"
    json = TopicViewSerializer.new(topic_view, scope: Guardian.new, root: false).as_json
    expect(json[:valid_reactions]).to eq(%w(laughing heart open_mouth cry angry thumbsup thumbsdown))
  end
end
