# frozen_string_literal: true

require "rails_helper"

describe DiscourseReactions do
  before do
    SiteSetting.discourse_reactions_enabled = true
    SiteSetting.discourse_reactions_like_sync_enabled = true
    SiteSetting.discourse_reactions_excluded_from_like = ""
  end

  describe "on_setting_change(discourse_reactions_excluded_from_like)" do
    it "kicks off the background job to sync post actions when site setting changes" do
      expect_enqueued_with(job: ::Jobs::DiscourseReactions::PostActionSynchronizer) do
        SiteSetting.discourse_reactions_excluded_from_like = "confetti_ball|-1"
      end
    end
  end

  describe "user_action_stream_builder modifier for UserAction.stream" do
    fab!(:user_1) { Fabricate(:user) }
    fab!(:user_2) { Fabricate(:user) }
    fab!(:post) { Fabricate(:post, user: user_1) }
    fab!(:post_2) { Fabricate(:post, user: user_1) }

    before do
      UserActionManager.enable
      SiteSetting.discourse_reactions_excluded_from_like = "-1"
    end

    it "excludes WAS_LIKED records where there is an associated ReactionUser for the post and user" do
      # user_2 reacted to user_1's post, which also counts as a like
      DiscourseReactions::ReactionManager.new(
        reaction_value: "clap",
        user: user_2,
        post: post,
      ).toggle!

      # user_2 reacted to user_1's other post, which just counts as a
      # regular like because it uses main_reaction_id, so it should
      # show on the user action stream
      DiscourseReactions::ReactionManager.new(
        reaction_value: DiscourseReactions::Reaction.main_reaction_id,
        user: user_2,
        post: post_2,
      ).toggle!

      user_actions = UserAction.stream({ user_id: user_1.id, guardian: user_1.guardian, limit: 10 })
      expect(user_actions.length).to eq(1)
      expect(user_actions.first.action_type).to eq(UserAction::WAS_LIKED)
      expect(user_actions.first.post_id).to eq(post_2.id)
      expect(user_actions.first.target_user_id).to eq(user_1.id)
    end
  end
end
