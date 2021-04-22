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
  fab!(:reaction_user_2) { Fabricate(:reaction_user, reaction: reaction_1, user: user_1, post: post_2) }
  fab!(:reaction_user_3) { Fabricate(:reaction_user, reaction: reaction_3, user: user_4, post: post_2) }
  fab!(:reaction_user_4) { Fabricate(:reaction_user, reaction: reaction_2, user: user_3, post: post_2) }

  before do
    Rake::Task.clear
    Discourse::Application.load_tasks
  end

  it "migrates all reactions to like" do
    HighLine::Simulate.with('y') do
      Rake::Task['reactions:nuke'].invoke
    end

    expect(DiscourseReactions::Reaction.all.count).to eq(0)
    expect(post_2.like_count).to eq(4)
  end
end
