# frozen_string_literal: true

RSpec.describe DiscourseReactions::ReactionPostActionSynchronizer do
  fab!(:user) { Fabricate(:user) }
  fab!(:post) { Fabricate(:post) }
  fab!(:post_2) { Fabricate(:post) }
  fab!(:reaction_plus_one) { Fabricate(:reaction, reaction_value: "+1", post: post) }
  fab!(:reaction_user) do
    Fabricate(:reaction_user, user: user, post: post, reaction: reaction_plus_one)
  end

  fab!(:reaction_clap) { Fabricate(:reaction, reaction_value: "clap", post: post_2) }
  fab!(:reaction_user_2) do
    Fabricate(
      :reaction_user,
      user: user,
      post: post_2,
      reaction: reaction_clap,
      skip_post_action: true,
    )
  end

  before do
    SiteSetting.discourse_reactions_like_sync_enabled = true
    SiteSetting.discourse_reactions_enabled_reactions += "heart|clap|+1|-1"
    SiteSetting.discourse_reactions_excluded_from_like = "clap|-1"

    UserActionManager.enable
    UserActionManager.post_action_created(reaction_user.post_action_like)
  end

  it "does nothing if discourse_reactions_like_sync_enabled is false" do
    DB.expects(:exec).never
    SiteSetting.discourse_reactions_like_sync_enabled = false
    expect { described_class.sync! }.not_to change { PostAction.count }
  end

  describe "when reactions are added to the exception list" do
    before do
      SiteSetting.discourse_reactions_excluded_from_like += "|+1" # +1 added
    end

    it "trashes PostAction records" do
      post_action_id = reaction_user.post_action_like.id
      expect(reaction_user.post_action_like).to be_present
      expect { described_class.sync! }.to change { PostAction.count }.by(-1)
      expect(reaction_user.reload.post_action_like).to be_nil
      expect(PostAction.with_deleted.find_by(id: post_action_id).deleted_at).to be_present
    end

    it "removes UserAction records for LIKED and WAS_LIKED" do
      expect { described_class.sync! }.to change { UserAction.count }.by(-2)
    end
  end

  describe "when reactions are removed from the exception list" do
    it "creates PostAction records" do
      SiteSetting.discourse_reactions_excluded_from_like = "-1" # clap removed
      expect(reaction_user_2.post_action_like).to be_nil
      expect { described_class.sync! }.to change { PostAction.count }.by(1)
      expect(reaction_user_2.reload.post_action_like).to be_present
    end

    it "updates existing trashed PostUpdate records to recover them" do
      trashed_post_action =
        Fabricate(
          :post_action,
          post: reaction_user_2.post,
          user: reaction_user_2.user,
          post_action_type_id: PostActionType.types[:like],
        )
      trashed_post_action.trash!(Fabricate(:user))
      SiteSetting.discourse_reactions_excluded_from_like = "-1" # clap removed
      expect { described_class.sync! }.to change { PostAction.count }.by(1)
      expect(trashed_post_action.reload.trashed?).to eq(false)
    end

    it "creates UserAction records for LIKED and WAS_LIKED" do
      SiteSetting.discourse_reactions_excluded_from_like = "-1" # clap removed
      expect { described_class.sync! }.to change { UserAction.count }.by(2)
      expect(
        UserAction.exists?(
          action_type: UserAction::LIKE,
          user_id: reaction_user_2.post_action_like.user_id,
          acting_user_id: reaction_user_2.post_action_like.user_id,
          target_post_id: reaction_user_2.post_action_like.post_id,
          target_topic_id: reaction_user_2.post.topic_id,
        ),
      ).to eq(true)
      expect(
        UserAction.exists?(
          action_type: UserAction::WAS_LIKED,
          user_id: reaction_user_2.post.user_id,
          acting_user_id: reaction_user_2.post_action_like.user_id,
          target_post_id: reaction_user_2.post_action_like.post_id,
          target_topic_id: reaction_user_2.post.topic_id,
        ),
      ).to eq(true)
    end

    it "skips UserAction records where the post has a null user" do
      reaction_user_2.post.update_columns(user_id: nil)
      SiteSetting.discourse_reactions_excluded_from_like = "-1" # clap removed
      expect { described_class.sync! }.not_to change { UserAction.count }
    end

    it "if no reactions are excluded from like it adds post actions for ones previously excluded" do
      SiteSetting.discourse_reactions_excluded_from_like = ""
      expect(reaction_user_2.post_action_like).to be_nil
      expect { described_class.sync! }.to change { PostAction.count }.by(1)
      expect(reaction_user_2.reload.post_action_like).to be_present
    end
  end
end
