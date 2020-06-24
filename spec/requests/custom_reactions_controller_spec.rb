# frozen_string_literal: true

require 'rails_helper'

describe DiscourseReactions::CustomReactionsController do
  fab!(:post_1) { Fabricate(:post) }
  fab!(:user_1) { Fabricate(:user) }
  fab!(:user_2) { Fabricate(:user) }

  context '#toggle' do
    let(:payload_with_user) {
      [
        {
          'id' => 'thumbsup',
          'type' => 'emoji',
          'users' => [
            { 'username' => user_1.username, 'avatar_template' => user_1.avatar_template, 'can_undo' => true }
          ],
          'count' => 1
        }
      ]
    }

    it 'toggles reaction' do
      sign_in(user_1)
      expected_payload = [
        {
          'id' => 'thumbsup',
          'type' => 'emoji',
          'users' => [
            { 'username' => user_1.username, 'avatar_template' => user_1.avatar_template, 'can_undo' => true }
          ],
          'count' => 1
        }
      ]
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsup/toggle.json"
      expect(DiscourseReactions::Reaction.count).to eq(1)
      expect(DiscourseReactions::ReactionUser.count).to eq(1)
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)['reactions']).to eq(expected_payload)

      reaction = DiscourseReactions::Reaction.last
      expect(reaction.reaction_value). to eq('thumbsup')
      expect(reaction.reaction_users_count). to eq(1)

      sign_in(user_2)
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsup/toggle.json"
      reaction = DiscourseReactions::Reaction.last
      expect(reaction.reaction_value). to eq('thumbsup')
      expect(reaction.reaction_users_count).to eq(2)
      expect(JSON.parse(response.body)['reactions'][0]['users']).to eq([
        { 'username' => user_1.username, 'avatar_template' => user_1.avatar_template, 'can_undo' => true },
        { 'username' => user_2.username, 'avatar_template' => user_2.avatar_template, 'can_undo' => true }
      ])

      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsup/toggle.json"
      expect(DiscourseReactions::Reaction.count).to eq(1)
      expect(DiscourseReactions::ReactionUser.count).to eq(1)
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)['reactions']).to eq(expected_payload)

      sign_in(user_1)
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsup/toggle.json"
      expect(DiscourseReactions::Reaction.count).to eq(0)
      expect(DiscourseReactions::ReactionUser.count).to eq(0)
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)['reactions']).to eq([])
    end

    it 'sends MessageBus message that user acted' do
      sign_in(user_1)
      messages = MessageBus.track_publish("/topic/#{post_1.topic.id}") do
        put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsdown/toggle.json"
        put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsdown/toggle.json"
      end
      expect(messages.count).to eq(2)
      expect(messages.map(&:data).map { |m| m[:type] }.uniq).to eq(%i(acted))
    end

    it 'errors when reaction is invalid' do
      sign_in(user_1)
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/invalid-reaction/toggle.json"
      expect(DiscourseReactions::Reaction.count).to eq(0)
      expect(response.status).to eq(422)
    end
  end

  context 'positive notifications' do
    before do
      PostActionNotifier.enable
    end

    it 'creates notification when first positive like' do
      sign_in(user_1)
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsup/toggle.json"
      expect(Notification.count).to eq(1)
      expect(PostAction.count).to eq(1)
      expect(PostAction.last.post_action_type_id).to eq(PostActionType.types[:like])

      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/laughing/toggle.json"
      expect(Notification.count).to eq(1)
      expect(PostAction.count).to eq(1)

      sign_in(user_2)
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsup/toggle.json"
      expect(Notification.count).to eq(1)
      expect(PostAction.count).to eq(2)

      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsup/toggle.json"
      expect(Notification.count).to eq(1)
      expect(PostAction.count).to eq(1)

      sign_in(user_1)
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsup/toggle.json"
      expect(Notification.count).to eq(1)
      expect(PostAction.count).to eq(1)

      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/laughing/toggle.json"
      expect(Notification.count).to eq(0)
      expect(PostAction.count).to eq(0)
    end
  end

  context 'neutral or negative notifications' do
    it 'calls ReactinNotification service' do
      sign_in(user_1)
      DiscourseReactions::ReactionNotification.any_instance.expects(:create).once
      DiscourseReactions::ReactionNotification.any_instance.expects(:delete).once
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsdown/toggle.json"
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsdown/toggle.json"
    end
  end

  it 'allows to delete reaction only in undo action window frame' do
    SiteSetting.post_undo_action_window_mins = 10
    sign_in(user_1)
    put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsup/toggle.json"
    expect(DiscourseReactions::Reaction.count).to eq(1)
    expect(DiscourseReactions::ReactionUser.count).to eq(1)
    put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsup/toggle.json"
    expect(DiscourseReactions::Reaction.count).to eq(0)
    expect(DiscourseReactions::ReactionUser.count).to eq(0)
    put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsup/toggle.json"
    expect(DiscourseReactions::Reaction.count).to eq(1)
    expect(DiscourseReactions::ReactionUser.count).to eq(1)
    freeze_time(Time.zone.now + 11.minutes)
    put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/thumbsup/toggle.json"
    expect(DiscourseReactions::Reaction.count).to eq(1)
    expect(DiscourseReactions::ReactionUser.count).to eq(1)
    expect(response.status).to eq(400)
  end
end
