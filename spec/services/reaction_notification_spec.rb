# frozen_string_literal: true

require 'rails_helper'
require_relative '../fabricators/reaction_fabricator.rb'
require_relative '../fabricators/reaction_user_fabricator.rb'

describe DiscourseReactions::ReactionNotification do
  before do
    PostActionNotifier.enable
  end

  fab!(:post_1) { Fabricate(:post) }
  fab!(:thumbsup) { Fabricate(:reaction, post: post_1, reaction_value: 'thumbsup') }
  fab!(:user_1) { Fabricate(:user) }
  fab!(:reaction_user1) { Fabricate(:reaction_user, reaction: thumbsup, user: user_1) }

  it 'does not create notification when user is muted' do
    MutedUser.create!(user_id: post_1.user.id, muted_user_id: user_1.id)
    expect { described_class.new(thumbsup, user_1).create }.to change { Notification.count }.by(0)
  end

  it 'does not create notification when topic is muted' do
    TopicUser.create!(
      topic: post_1.topic,
      user: post_1.user,
      notification_level: TopicUser.notification_levels[:muted]
    )
    MutedUser.create!(user_id: post_1.user.id, muted_user_id: user_1.id)
    described_class.new(thumbsup, user_1).create
    expect { described_class.new(thumbsup, user_1).create }.to change { Notification.count }.by(0)
  end

  it 'does not create notification when notification setting is never' do
    post_1.user.user_option.update!(
      like_notification_frequency:
      UserOption.like_notification_frequency_type[:never]
    )
    MutedUser.create!(user_id: post_1.user.id, muted_user_id: user_1.id)
    expect { described_class.new(thumbsup, user_1).create }.to change { Notification.count }.by(0)
  end

  it 'correctly creates notification when notification setting is first time and daily' do
    post_1.user.user_option.update!(
      like_notification_frequency:
      UserOption.like_notification_frequency_type[:first_time_and_daily]
    )

    expect { described_class.new(thumbsup, user_1).create }.to change { Notification.count }.by(1)
    expect(Notification.last.user_id).to eq(post_1.user.id)
    expect(Notification.last.notification_type).to eq(Notification.types[:reaction])
    expect(JSON.parse(Notification.last.data)['original_username']).to eq(user_1.username)

    user_2 = Fabricate(:user)
    Fabricate(:reaction_user, reaction: thumbsup, user: user_2)
    expect { described_class.new(thumbsup, user_2).create }.to change { Notification.count }.by(0)

    freeze_time(Time.zone.now + 1.day)

    cry = Fabricate(:reaction, post: post_1, reaction_value: 'cry')
    Fabricate(:reaction_user, reaction: cry, user: user_2)
    expect { described_class.new(cry, user_2).create }.to change { Notification.count }.by(1)
  end

  it 'correctly creates notification when notification setting is always' do
    post_1.user.user_option.update!(
      like_notification_frequency:
      UserOption.like_notification_frequency_type[:always]
    )

    expect { described_class.new(thumbsup, user_1).create }.to change { Notification.count }.by(1)
    expect(Notification.last.user_id).to eq(post_1.user.id)
    expect(JSON.parse(Notification.last.data)['original_username']).to eq(user_1.username)

    cry = Fabricate(:reaction, post: post_1, reaction_value: 'cry')
    Fabricate(:reaction_user, reaction: cry, user: user_1)
    described_class.new(cry, user_1).create
    expect { described_class.new(cry, user_1).create }.to change { Notification.count }.by(1)

    user_2 = Fabricate(:user)
    Fabricate(:reaction_user, reaction: cry, user: user_2)
    expect { described_class.new(cry, user_2).create }.to change { Notification.count }.by(1)
  end

  it 'deletes notification when all reactions are removed' do
    expect { described_class.new(thumbsup, user_1).create }.to change { Notification.count }.by(1)

    cry = Fabricate(:reaction, post: post_1, reaction_value: 'cry')
    Fabricate(:reaction_user, reaction: cry, user: user_1)
    expect { described_class.new(cry, user_1).create }.to change { Notification.count }.by(0)

    user_2 = Fabricate(:user)
    Fabricate(:reaction_user, reaction: cry, user: user_2)
    expect { described_class.new(cry, user_1).create }.to change { Notification.count }.by(0)
    expect(JSON.parse(Notification.last.data)['display_username']).to eq(user_1.username)

    DiscourseReactions::ReactionUser.find_by(reaction: cry, user: user_1).destroy
    DiscourseReactions::ReactionUser.find_by(reaction: thumbsup, user: user_1).destroy
    expect do
      described_class.new(cry, user_1).delete
      described_class.new(thumbsup, user_1).delete
    end.to change { Notification.count }.by(0)
    expect(JSON.parse(Notification.last.data)['display_username']).to eq(user_2.username)
    expect(Notification.last.notification_type).to eq(Notification.types[:reaction])

    DiscourseReactions::ReactionUser.find_by(reaction: cry, user: user_2).destroy
    expect { described_class.new(cry, user_2).delete }.to change { Notification.count }.by(-1)
  end
end
