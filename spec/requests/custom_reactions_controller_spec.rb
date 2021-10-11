# frozen_string_literal: true

require 'rails_helper'
require_relative '../fabricators/reaction_fabricator.rb'
require_relative '../fabricators/reaction_user_fabricator.rb'

describe DiscourseReactions::CustomReactionsController do
  fab!(:post_1) { Fabricate(:post) }
  fab!(:user_1) { Fabricate(:user) }
  fab!(:user_2) { Fabricate(:user) }
  fab!(:user_3) { Fabricate(:user) }
  fab!(:user_4) { Fabricate(:user) }
  fab!(:user_5) { Fabricate(:user) }
  fab!(:post_2) { Fabricate(:post, user: user_1) }
  fab!(:reaction_1) { Fabricate(:reaction, post: post_2, reaction_value: "laughing") }
  fab!(:reaction_2) { Fabricate(:reaction, post: post_2, reaction_value: "open_mouth") }
  fab!(:reaction_3) { Fabricate(:reaction, post: post_2, reaction_value: "hugs") }
  fab!(:like) { Fabricate(:post_action, post: post_2, user: user_5, post_action_type_id: PostActionType.types[:like]) }
  fab!(:reaction_user_1) { Fabricate(:reaction_user, reaction: reaction_1, user: user_2, post: post_2) }
  fab!(:reaction_user_2) { Fabricate(:reaction_user, reaction: reaction_1, user: user_1, post: post_2) }
  fab!(:reaction_user_3) { Fabricate(:reaction_user, reaction: reaction_3, user: user_4, post: post_2) }
  fab!(:reaction_user_4) { Fabricate(:reaction_user, reaction: reaction_2, user: user_3, post: post_2) }

  before do
    SiteSetting.discourse_reactions_like_icon = 'heart'
    SiteSetting.discourse_reactions_enabled_reactions = "laughing|open_mouth|cry|angry|thumbsup|hugs"
  end

  context '#toggle' do
    let(:payload_with_user) {
      [
        {
          'id' => 'hugs',
          'type' => 'emoji',
          'count' => 1
        }
      ]
    }

    it 'toggles reaction' do
      sign_in(user_1)
      expected_payload = [
        {
          'id' => 'hugs',
          'type' => 'emoji',
          'count' => 1
        }
      ]
      expect do
        put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/hugs/toggle.json"
      end.to change { DiscourseReactions::Reaction.count }.by(1)
        .and change { DiscourseReactions::ReactionUser.count }.by(1)

      expect(response.status).to eq(200)
      expect(response.parsed_body['reactions']).to eq(expected_payload)

      reaction = DiscourseReactions::Reaction.last
      expect(reaction.reaction_value).to eq('hugs')
      expect(reaction.reaction_users_count).to eq(1)

      sign_in(user_2)
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/hugs/toggle.json"
      reaction = DiscourseReactions::Reaction.last
      expect(reaction.reaction_value).to eq('hugs')
      expect(reaction.reaction_users_count).to eq(2)

      expect do
        put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/hugs/toggle.json"
      end.to change { DiscourseReactions::Reaction.count }.by(0)
        .and change { DiscourseReactions::ReactionUser.count }.by(-1)

      expect(response.status).to eq(200)
      expect(response.parsed_body['reactions']).to eq(expected_payload)

      sign_in(user_1)
      expect do
        put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/hugs/toggle.json"
      end.to change { DiscourseReactions::Reaction.count }.by(-1)
        .and change { DiscourseReactions::ReactionUser.count }.by(-1)

      expect(response.status).to eq(200)
      expect(response.parsed_body['reactions']).to eq([])
    end

    it 'publishes MessageBus messages' do
      sign_in(user_1)

      messages = MessageBus.track_publish("/topic/#{post_1.topic.id}") do
        put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/cry/toggle.json"
        put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/cry/toggle.json"
      end
      expect(messages.count).to eq(2)
      expect(messages.map(&:data).map { |m| m[:type] }.uniq).to eq(%i(acted))

      messages = MessageBus.track_publish("/topic/#{post_1.topic.id}/reactions") do
        put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/cry/toggle.json"
        put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/cry/toggle.json"
      end
      expect(messages.count).to eq(2)
      expect(messages.map(&:channel).uniq.first).to eq("/topic/#{post_1.topic.id}/reactions")
    end

    it 'errors when reaction is invalid' do
      sign_in(user_1)
      expect do
        put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/invalid-reaction/toggle.json"
      end.to change { DiscourseReactions::Reaction.count }.by(0)

      expect(response.status).to eq(422)
    end
  end

  context '#reactions_given' do
    fab!(:private_topic) { Fabricate(:private_message_topic, user: user_2) }
    fab!(:private_post) { Fabricate(:post, topic: private_topic) }
    fab!(:secure_group) { Fabricate(:group) }
    fab!(:secure_category) { Fabricate(:private_category, group: secure_group) }
    fab!(:secure_topic) { Fabricate(:topic, category: secure_category) }
    fab!(:secure_post) { Fabricate(:post, topic: secure_topic) }
    fab!(:private_reaction) { Fabricate(:reaction, post: private_post, reaction_value: "hugs") }
    fab!(:secure_reaction) { Fabricate(:reaction, post: secure_post, reaction_value: "hugs") }
    fab!(:private_topic_reaction_user) { Fabricate(:reaction_user, reaction: private_reaction, user: user_2, post: private_post) }
    fab!(:secure_topic_reaction_user) { Fabricate(:reaction_user, reaction: secure_reaction, user: user_2, post: secure_post) }

    it 'returns reactions given by a user' do
      sign_in(user_1)

      get "/discourse-reactions/posts/reactions.json", params: { username: user_2.username }
      parsed = response.parsed_body

      expect(parsed[0]['user']['id']).to eq(user_2.id)
      expect(parsed[0]['post_id']).to eq(post_2.id)
      expect(parsed[0]['post']['user']['id']).to eq(user_1.id)
      expect(parsed[0]['reaction']['id']).to eq(reaction_1.id)
    end

    it 'does not return reactions for private messages' do
      sign_in(user_1)

      get "/discourse-reactions/posts/reactions.json", params: { username: user_2.username }
      parsed = response.parsed_body
      expect(response.parsed_body.map { |reaction| reaction["post_id"] }).not_to include(private_post.id)

      sign_in(user_2)

      get "/discourse-reactions/posts/reactions.json", params: { username: user_2.username }
      parsed = response.parsed_body
      expect(response.parsed_body.map { |reaction| reaction["post_id"] }).to include(private_post.id)
    end

    it 'does not return reactions for secure categories' do
      secure_group.add(user_2)
      sign_in(user_1)

      get "/discourse-reactions/posts/reactions.json", params: { username: user_2.username }
      parsed = response.parsed_body
      expect(response.parsed_body.map { |reaction| reaction["post_id"] }).not_to include(secure_post.id)

      secure_group.add(user_1)
      get "/discourse-reactions/posts/reactions.json", params: { username: user_2.username }
      parsed = response.parsed_body
      expect(response.parsed_body.map { |reaction| reaction["post_id"] }).to include(secure_post.id)

      sign_in(user_2)

      get "/discourse-reactions/posts/reactions.json", params: { username: user_2.username }
      parsed = response.parsed_body
      expect(response.parsed_body.map { |reaction| reaction["post_id"] }).to include(secure_post.id)
    end

    context 'a post with one of your reactions has been deleted' do
      fab!(:deleted_post) { Fabricate(:post) }
      fab!(:kept_post) { Fabricate(:post) }
      fab!(:user) { Fabricate(:user) }
      fab!(:reaction_on_deleted_post) { Fabricate(:reaction, post: deleted_post, reaction_value: "laughing") }
      fab!(:reaction_on_kept_post) { Fabricate(:reaction, post: kept_post, reaction_value: "laughing") }
      fab!(:reaction_user_on_deleted_post) { Fabricate(:reaction_user, reaction: reaction_on_deleted_post, user: user, post: deleted_post) }
      fab!(:reaction_user_on_kept_post) { Fabricate(:reaction_user, reaction: reaction_on_kept_post, user: user, post: kept_post) }

      it 'doesn’t return the deleted post/reaction' do
        sign_in(user)

        get "/discourse-reactions/posts/reactions.json", params: { username: user.username }
        parsed = response.parsed_body
        expect(parsed.length).to eq(2)

        PostDestroyer.new(Discourse.system_user, deleted_post).destroy

        get "/discourse-reactions/posts/reactions.json", params: { username: user.username }
        parsed = response.parsed_body

        expect(parsed.length).to eq(1)
        expect(parsed[0]['post_id']).to eq(kept_post.id)
      end
    end
  end

  context '#reactions_received' do
    it 'returns reactions received by a user' do
      sign_in(user_2)

      get "/discourse-reactions/posts/reactions-received.json", params: { username: user_1.username }
      parsed = response.parsed_body

      expect(parsed[0]['user']['id']).to eq(user_3.id)
      expect(parsed[0]['post_id']).to eq(post_2.id)
      expect(parsed[0]['post']['user']['id']).to eq(user_1.id)
      expect(parsed[0]['reaction']['id']).to eq(reaction_2.id)
    end
  end

  context '#post_reactions_users' do
    it 'return reaction_users of post when theres no parameters' do
      get "/discourse-reactions/posts/#{post_2.id}/reactions-users.json"
      parsed = response.parsed_body

      expect(response.status).to eq(200)
      expect(parsed["reaction_users"][0]["users"][0]["username"]).to eq(user_5.username)
      expect(parsed["reaction_users"][0]["users"][0]["name"]).to eq(user_5.name)
      expect(parsed["reaction_users"][0]["users"][0]["avatar_template"]).to eq(user_5.avatar_template)
    end

    it 'return reaction_users of reaction when there are parameters' do
      get "/discourse-reactions/posts/#{post_2.id}/reactions-users.json?reaction_value=#{reaction_1.reaction_value}"
      parsed = response.parsed_body

      expect(response.status).to eq(200)
      expect(parsed["reaction_users"][0]["users"][0]["username"]).to eq(user_1.username)
      expect(parsed["reaction_users"][0]["users"][0]["name"]).to eq(user_1.name)
      expect(parsed["reaction_users"][0]["users"][0]["avatar_template"]).to eq(user_1.avatar_template)
    end

    it "gives 400 ERROR when the post_id OR reaction_value is invalid" do
      get "/discourse-reactions/posts/1000000/reactions-users.json"
      expect(response.status).to eq(400)

      get "/discourse-reactions/posts/1000000/reactions-users.json?reaction_value=test"
      expect(response.status).to eq(400)
    end

    it 'merges identic custom reaction into likes' do
      get "/discourse-reactions/posts/#{post_2.id}/reactions-users.json?reaction_value=#{DiscourseReactions::Reaction.main_reaction_id}"
      parsed = response.parsed_body
      like_count = parsed["reaction_users"][0]["count"].to_i
      expect(parsed["reaction_users"][0]["count"]).to eq(post_2.like_count)

      get "/discourse-reactions/posts/#{post_2.id}/reactions-users.json?reaction_value=laughing"
      parsed = response.parsed_body
      reaction_count = parsed["reaction_users"][0]["count"].to_i
      expect(parsed["reaction_users"][0]["count"]).to eq(reaction_1.reaction_users_count)

      SiteSetting.discourse_reactions_reaction_for_like = 'laughing'

      get "/discourse-reactions/posts/#{post_2.id}/reactions-users.json?reaction_value=#{DiscourseReactions::Reaction.main_reaction_id}"
      parsed = response.parsed_body
      expect(parsed["reaction_users"][0]["count"]).to eq(like_count + reaction_count)
    end
  end

  context 'positive notifications' do
    before do
      PostActionNotifier.enable
    end

    it 'creates notification when first like' do
      sign_in(user_1)
      expect do
        put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/heart/toggle.json"
      end.to change { Notification.count }.by(1)
        .and change { PostAction.count }.by(1)

      expect(PostAction.last.post_action_type_id).to eq(PostActionType.types[:like])

      expect do
        put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/heart/toggle.json"
      end.to change { Notification.count }.by(-1)
        .and change { PostAction.count }.by(-1)
    end
  end

  context 'reaction notifications' do
    it 'calls ReactinNotification service' do
      sign_in(user_1)
      DiscourseReactions::ReactionNotification.any_instance.expects(:create).once
      DiscourseReactions::ReactionNotification.any_instance.expects(:delete).once
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/cry/toggle.json"
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/cry/toggle.json"
    end
  end

  it 'allows to delete reaction only in undo action window frame' do
    SiteSetting.post_undo_action_window_mins = 10
    sign_in(user_1)
    expect do
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/hugs/toggle.json"
    end.to change { DiscourseReactions::Reaction.count }.by(1)
      .and change { DiscourseReactions::ReactionUser.count }.by(1)

    expect do
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/hugs/toggle.json"
    end.to change { DiscourseReactions::Reaction.count }.by(-1)
      .and change { DiscourseReactions::ReactionUser.count }.by(-1)

    expect do
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/hugs/toggle.json"
    end.to change { DiscourseReactions::Reaction.count }.by(1)
      .and change { DiscourseReactions::ReactionUser.count }.by(1)

    freeze_time(Time.zone.now + 11.minutes)
    expect do
      put "/discourse-reactions/posts/#{post_1.id}/custom-reactions/hugs/toggle.json"
    end.to change { DiscourseReactions::Reaction.count }.by(0)
      .and change { DiscourseReactions::ReactionUser.count }.by(0)

    expect(response.status).to eq(403)
  end
end
