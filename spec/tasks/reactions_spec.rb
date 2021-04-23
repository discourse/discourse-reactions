# frozen_string_literal: true

require 'rails_helper'
require 'highline/import'
require 'highline/simulate'

RSpec.describe "reactions tasks" do
  fab!(:user_1) { Fabricate(:user) }
  fab!(:user_2) { Fabricate(:user) }
  fab!(:user_3) { Fabricate(:user) }
  fab!(:user_4) { Fabricate(:user) }
  fab!(:post_2) { Fabricate(:post, user: user_1) }
  fab!(:reaction_1) { Fabricate(:reaction, post: post_2, reaction_value: "laughing") }
  fab!(:reaction_2) { Fabricate(:reaction, post: post_2, reaction_value: "open_mouth") }
  fab!(:reaction_3) { Fabricate(:reaction, post: post_2, reaction_value: "hugs") }
  fab!(:reaction_user_1) { Fabricate(:reaction_user, reaction: reaction_1, user: user_2, post: post_2) }
  fab!(:reaction_user_3) { Fabricate(:reaction_user, reaction: reaction_3, user: user_4, post: post_2) }
  fab!(:reaction_user_4) { Fabricate(:reaction_user, reaction: reaction_2, user: user_3, post: post_2) }

  describe 'nuke' do
    before(:each) do
      Rake::Task['reactions:nuke'].reenable
    end

    it "migrates all reactions to like" do
      HighLine::Simulate.with('y') do
        Rake::Task['reactions:nuke'].invoke
      end

      post_2.reload
      expect(DiscourseReactions::Reaction.all.count).to eq(0)
      expect(post_2.like_count).to eq(3)
    end

    it "migrates given list of reactions to like" do
      HighLine::Simulate.with('y') do
        Rake::Task['reactions:nuke'].invoke("laughing|hugs")
      end

      post_2.reload
      expect(DiscourseReactions::Reaction.all.count).to eq(0)
      expect(post_2.like_count).to eq(2)
    end

    it "Deletes all the remaining reactions & reaction users" do
      HighLine::Simulate.with('y') do
        Rake::Task['reactions:nuke'].invoke("laughing|hugs")
      end

      expect(DiscourseReactions::Reaction.all.count).to eq(0)
      expect(DiscourseReactions::ReactionUser.all.count).to eq(0)
    end

    it "raise RuntimeError when reaction-value is invalid" do
      HighLine::Simulate.with('y') do
        expect { Rake::Task['reactions:nuke'].invoke("laughing|hugss") }.to raise_error(RuntimeError)
      end
    end
  end
end
