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
end
