# frozen_string_literal: true

RSpec.describe DiscourseReactions::ReactionPostActionSynchronizer do
  fab!(:user) { Fabricate(:user) }
  fab!(:post) { Fabricate(:post) }
  fab!(:post_2) { Fabricate(:post) }
  fab!(:post_action) do
    Fabricate(
      :post_action,
      user: user,
      post: post,
      post_action_type_id: PostActionType.types[:like],
    )
  end
  fab!(:reaction_plus_one) { Fabricate(:reaction, reaction_value: "+1", post: post) }
  fab!(:reaction_user) do
    Fabricate(:reaction_user, user: user, post: post, reaction: reaction_plus_one)
  end

  fab!(:reaction_clap) { Fabricate(:reaction, reaction_value: "clap", post: post_2) }
  fab!(:reaction_user_2) do
    Fabricate(:reaction_user, user: user, post: post_2, reaction: reaction_clap)
  end

  before do
    SiteSetting.discourse_reactions_enabled_reactions += "heart|clap|+1|-1"
    SiteSetting.discourse_reactions_excluded_from_like = "clap|-1"
  end

  it "removes PostAction records for reactions added to the exception list (+1)" do
    SiteSetting.discourse_reactions_excluded_from_like += "|+1"
    expect(reaction_user.post_action_like).to be_present
    expect { described_class.sync! }.to change { PostAction.count }.by(-1)
    expect(reaction_user.reload.post_action_like).to be_nil
  end

  it "creates PostAction records for reactions removed from the exception list (clap)" do
    SiteSetting.discourse_reactions_excluded_from_like = "-1"
    expect(reaction_user_2.post_action_like).to be_nil
    expect { described_class.sync! }.to change { PostAction.count }.by(1)
    expect(reaction_user_2.reload.post_action_like).to be_present
  end
end
