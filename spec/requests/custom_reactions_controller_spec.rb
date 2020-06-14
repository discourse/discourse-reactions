# frozen_string_literal: true

require 'rails_helper'
require_relative '../fabricators/reaction_fabricator.rb'

describe DiscourseReactions::CustomReactionsController do
  fab!(:post_1) { Fabricate(:post) }
  fab!(:user_1) { Fabricate(:user) }

  before do
    sign_in(user_1)
  end

  context 'POST' do
    it 'creates reaction if does not exists' do
      expected_reactions_payload = [
        {
          'id' => 'thumbsup',
          'type' => 'emoji',
          'users' => [
            { 'username' => user_1.username, 'avatar_template' => user_1.avatar_template }
          ],
          'count' => 1
        }
      ]
      post '/discourse-reactions/custom_reactions.json', params: { post_id: post_1.id, reaction: "thumbsup" }
      expect(DiscourseReactions::Reaction.count).to eq(1)
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)['reactions']).to eq(expected_reactions_payload)

      post '/discourse-reactions/custom_reactions.json', params: { post_id: post_1.id, reaction: "thumbsup" }
      expect(DiscourseReactions::Reaction.count).to eq(1)
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)['reactions']).to eq(expected_reactions_payload)
    end

    it 'errors when emoji is invalid' do
      post '/discourse-reactions/custom_reactions.json', params: { post_id: post_1.id, reaction: "invalid_emoji" }
      expect(DiscourseReactions::Reaction.count).to eq(0)
      expect(response.status).to eq(422)
    end
  end

  context 'DELETE' do
    it 'deletes reaction if exists' do
      reaction = Fabricate(:reaction, user: user_1, post: post_1)
      delete '/discourse-reactions/custom_reactions.json', params: { post_id: post_1.id, reaction: "otter" }
      expect(response.status).to eq(200)
      expect { reaction.reload }.to raise_error ActiveRecord::RecordNotFound
    end
  end
end
