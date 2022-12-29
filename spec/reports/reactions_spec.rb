# frozen_string_literal: true

require "rails_helper"

describe Report do
  fab!(:user_1) { Fabricate(:user) }
  fab!(:user_2) { Fabricate(:user) }
  fab!(:post_1) { Fabricate(:post) }
  fab!(:post_2) { Fabricate(:post, user: user_1) }

  before { SiteSetting.discourse_reactions_enabled = true }

  it 'scopes the report to "like" post action type' do
    Fabricate(
      :post_action,
      post: post_1,
      user: user_1,
      post_action_type_id: PostActionType.types[:like],
      created_at: 1.day.ago,
    )
    Fabricate(
      :post_action,
      post: post_1,
      user: user_1,
      post_action_type_id: PostActionType.types[:spam],
      created_at: 1.day.ago,
    )
    Fabricate(
      :post_action,
      post: post_2,
      user: user_2,
      post_action_type_id: PostActionType.types[:like],
      created_at: 1.day.ago,
    )

    report = Report.find("reactions", start_date: 2.days.ago, end_date: Time.current)

    post_action_data = report.data.find { |x| x[:day] === 1.day.ago.to_date }
    expect(post_action_data[:like_count]).to eq(2)
  end
end
