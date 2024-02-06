# frozen_string_literal: true

require Rails.root.join(
          "plugins/discourse-reactions/db/migrate/20240130013701_create_post_action_reaction_user_historical_records.rb",
        )

RSpec.describe CreatePostActionReactionUserHistoricalRecords do
  fab!(:post)
  fab!(:user)

  it "does not create duplicate PostAction records if one already exists for that post and user" do
    Fabricate(
      :post_action,
      post: post,
      user: user,
      post_action_type_id: PostActionType.types[:like],
    )
    reaction = Fabricate(:reaction, reaction_value: "clap", post: post)
    Fabricate(:reaction_user, post: post, user: user, reaction: reaction, skip_post_action: true)
    expect { CreatePostActionReactionUserHistoricalRecords.new.up }.not_to change {
      PostAction.count
    }
  end

  it "will not create a PostAction record for any -1 reactions" do
    reaction = Fabricate(:reaction, reaction_value: "-1", post: post)
    Fabricate(:reaction_user, post: post, user: user, reaction: reaction)
    expect { CreatePostActionReactionUserHistoricalRecords.new.up }.not_to change {
      PostAction.count
    }
  end

  it "will create a PostAction record for a variety of reactions across posts which do not have them" do
    8.times do |i|
      post_n = Fabricate(:post, raw: "some post content for reactions #{i}")
      reaction =
        Fabricate(
          :reaction,
          reaction_value: SiteSetting.discourse_reactions_enabled_reactions.split("|").sample,
          post: post_n,
        )
      Fabricate(
        :reaction_user,
        post: post_n,
        user: user,
        reaction: reaction,
        skip_post_action: true,
      )
    end

    expect { CreatePostActionReactionUserHistoricalRecords.new.up }.to change {
      PostAction.count
    }.by(8)

    post_action = PostAction.last
    reaction = DiscourseReactions::Reaction.last
    reaction_user = DiscourseReactions::ReactionUser.last

    expect(post_action.post_action_type_id).to eq(PostActionType.types[:like])
    expect(post_action.post_id).to eq(reaction_user.post_id)
    expect(post_action.user_id).to eq(reaction_user.user_id)
    expect(SiteSetting.discourse_reactions_enabled_reactions.split("|")).to include(
      reaction.reaction_value,
    )
  end
end
