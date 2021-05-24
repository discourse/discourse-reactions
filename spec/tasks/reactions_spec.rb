# frozen_string_literal: true

require 'rails_helper'

RSpec.describe "reactions tasks" do
  fab!(:user_1) { Fabricate(:user) }
  fab!(:user_2) { Fabricate(:user) }
  fab!(:user_3) { Fabricate(:user) }
  fab!(:user_4) { Fabricate(:user) }
  fab!(:post_1) { Fabricate(:post, user: user_1) }
  fab!(:reaction_1) { Fabricate(:reaction, post: post_1, reaction_value: "laughing") }
  fab!(:reaction_2) { Fabricate(:reaction, post: post_1, reaction_value: "open_mouth") }
  fab!(:reaction_3) { Fabricate(:reaction, post: post_1, reaction_value: "hugs") }
  fab!(:reaction_user_1) { Fabricate(:reaction_user, reaction: reaction_1, user: user_2, post: post_1) }
  fab!(:reaction_user_3) { Fabricate(:reaction_user, reaction: reaction_3, user: user_4, post: post_1) }
  fab!(:reaction_user_4) { Fabricate(:reaction_user, reaction: reaction_2, user: user_3, post: post_1) }

  before do
    SiteSetting.discourse_reactions_enabled_reactions = 'laughing|open_mouth|hugs'
  end

  describe 'convert' do
    before(:each) do
      Rake::Task['reactions:convert'].reenable
    end

    it "does not remove the reaction" do
      Rake::Task['reactions:convert'].invoke("laughing")
      post_1.reload

      expect(post_1.reactions.length).to eq(2)
      expect(post_1.reactions.map { |reaction| reaction.reaction_value }).to eq(["open_mouth", "hugs"])
    end

    it "convert's the reaction" do
      Rake::Task['reactions:convert'].invoke("hugs", "open_mouth")
      post_1.reload

      expect(post_1.reactions.length).to eq(2)
      expect(post_1.reactions.pluck(:reaction_value)).to eq(["laughing", "open_mouth"])
    end

    it "does not convert the reaction if invoked with invalid reaction" do
      expect { Rake::Task['reactions:convert'].invoke("laughingg", "open_mouth") }.to raise_error(RuntimeError)
      Rake::Task['reactions:convert'].reenable
      expect { Rake::Task['reactions:convert'].invoke("laughing", "open_mouthh") }.to raise_error(RuntimeError)
    end
  end
end
