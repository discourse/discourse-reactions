# frozen_string_literal: true

require 'rails_helper'
require_relative '../fabricators/reaction_fabricator.rb'
require_relative '../fabricators/reaction_user_fabricator.rb'

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
            { 'username' => user_1.username, 'avatar_template' => user_1.avatar_template }
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
            { 'username' => user_1.username, 'avatar_template' => user_1.avatar_template }
          ],
          'count' => 1
        }
      ]
      put "/discourse-reactions/posts/#{post_1.id}/custom_reactions/thumbsup/toggle.json"
      expect(DiscourseReactions::Reaction.count).to eq(1)
      expect(DiscourseReactions::ReactionUser.count).to eq(1)
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)['reactions']).to eq(expected_payload)

      reaction = DiscourseReactions::Reaction.last
      expect(reaction.reaction_value). to eq('thumbsup')
      expect(reaction.reaction_users_count). to eq(1)

      sign_in(user_2)
      put "/discourse-reactions/posts/#{post_1.id}/custom_reactions/thumbsup/toggle.json"
      reaction = DiscourseReactions::Reaction.last
      expect(reaction.reaction_value). to eq('thumbsup')
      expect(reaction.reaction_users_count).to eq(2)
      expect(JSON.parse(response.body)['reactions'][0]['users']).to eq([
        { 'username' => user_1.username, 'avatar_template' => user_1.avatar_template },
        { 'username' => user_2.username, 'avatar_template' => user_2.avatar_template }
      ])

      put "/discourse-reactions/posts/#{post_1.id}/custom_reactions/thumbsup/toggle.json"
      expect(DiscourseReactions::Reaction.count).to eq(1)
      expect(DiscourseReactions::ReactionUser.count).to eq(1)
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)['reactions']).to eq(expected_payload)

      sign_in(user_1)
      put "/discourse-reactions/posts/#{post_1.id}/custom_reactions/thumbsup/toggle.json"
      expect(DiscourseReactions::Reaction.count).to eq(0)
      expect(DiscourseReactions::ReactionUser.count).to eq(0)
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)['reactions']).to eq([])

    end

    it 'errors when reaction is invalid' do
      sign_in(user_1)
      put "/discourse-reactions/posts/#{post_1.id}/custom_reactions/invalid-reaction/toggle.json"
      expect(DiscourseReactions::Reaction.count).to eq(0)
      expect(response.status).to eq(422)
    end
  end
end
