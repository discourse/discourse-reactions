# frozen_string_literal: true

require "rails_helper"
require_relative "../fabricators/reaction_fabricator.rb"
require_relative "../fabricators/reaction_user_fabricator.rb"

describe PostMover do
  fab!(:admin) { Fabricate(:admin) }
  fab!(:user) { Fabricate(:user) }
  fab!(:topic_1) { Fabricate(:topic, user: user) }
  fab!(:topic_2) { Fabricate(:topic, user: user) }
  fab!(:topic_3) { Fabricate(:topic, user: user) }
  fab!(:post_1) { Fabricate(:post, topic: topic_1, user: user) }
  fab!(:post_2) { Fabricate(:post, topic: topic_1, user: user) }
  fab!(:reaction_1) { Fabricate(:reaction, post: post_1) }
  fab!(:reaction_2) { Fabricate(:reaction, post: post_2) }
  fab!(:user_reaction_1) do
    Fabricate(:reaction_user, user: admin, reaction: reaction_1, post: post_1)
  end
  fab!(:user_reaction_2) do
    Fabricate(:reaction_user, user: admin, reaction: reaction_2, post: post_2)
  end

  before { SiteSetting.discourse_reactions_enabled = true }

  it "new post has topic's first post reactions (OP)" do
    expect(post_1.reactions).to include(reaction_1)
    expect(topic_2.posts.count).to eq(0)

    expect {
      topic_1.move_posts(admin, [post_1.id], { destination_topic_id: topic_2.id })
    }.to change { topic_2.posts.count }.by(1)

    expect(topic_2.posts.count).to eq(1)

    new_post = topic_2.first_post
    reaction_emojis = new_post.reactions.pluck(:reaction_value)

    expect(new_post.reactions.count).to eq(1)
    expect(reaction_emojis).to include(reaction_1.reaction_value)
  end

  it "moved post still has existing reactions" do
    expect(post_2.reactions).to include(reaction_2)
    expect(topic_3.posts.count).to eq(0)

    expect {
      topic_1.move_posts(admin, [post_2.id], { destination_topic_id: topic_3.id })
    }.to change { topic_3.posts.count }.by(1)

    expect(topic_3.posts.count).to eq(1)

    new_post = topic_3.first_post
    reaction_emojis = new_post.reactions.pluck(:reaction_value)

    expect(new_post.reactions.count).to eq(1)
    expect(reaction_emojis).to include(reaction_2.reaction_value)
  end
end
