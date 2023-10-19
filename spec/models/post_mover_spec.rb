# frozen_string_literal: true

require "rails_helper"
require_relative "../fabricators/reaction_fabricator.rb"
require_relative "../fabricators/reaction_user_fabricator.rb"

describe PostMover do
  fab!(:admin) { Fabricate(:admin) }
  fab!(:user) { Fabricate(:user) }
  fab!(:topic_1) { Fabricate(:topic, user: user) }
  fab!(:topic_2) { Fabricate(:topic, user: user) }
  fab!(:post_1) { Fabricate(:post, topic: topic_1, user: user) }
  fab!(:post_2) { Fabricate(:post, topic: topic_1, user: user) }
  fab!(:reaction_1) { Fabricate(:reaction, post: post_1, reaction_value: "clap") }
  fab!(:reaction_2) { Fabricate(:reaction, post: post_2, reaction_value: "+1") }
  fab!(:user_reaction_1) do
    Fabricate(:reaction_user, user: admin, reaction: reaction_1, post: post_1)
  end
  fab!(:user_reaction_2) do
    Fabricate(:reaction_user, user: admin, reaction: reaction_2, post: post_2)
  end

  before { SiteSetting.discourse_reactions_enabled = true }

  it "moved post still has existing reactions" do
    expect {
      topic_1.move_posts(admin, [post_2.id], { destination_topic_id: topic_2.id })
    }.to change { topic_2.posts.count }.by(1)

    reaction_emojis = topic_2.posts.last.reactions.pluck(:reaction_value)
    expect(reaction_emojis).to include("+1")
  end

  it "new post has topic's first post reactions (OP)" do
    expect {
      topic_1.move_posts(admin, [topic_1.first_post.id], { destination_topic_id: topic_2.id })
    }.to change { topic_2.posts.count }.by(1)

    reaction_emojis = topic_2.posts.last.reactions.pluck(:reaction_value)
    expect(reaction_emojis).to include("clap")
  end
end
