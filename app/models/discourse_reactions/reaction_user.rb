# frozen_string_literal: true

module DiscourseReactions
  class ReactionUser < ActiveRecord::Base
    self.table_name = "discourse_reactions_reaction_users"

    belongs_to :reaction, class_name: "DiscourseReactions::Reaction", counter_cache: true
    belongs_to :user
    belongs_to :post

    delegate :username, to: :user, allow_nil: true
    delegate :avatar_template, to: :user, allow_nil: true
    delegate :name, to: :user, allow_nil: true

    def can_undo?
      self.created_at > SiteSetting.post_undo_action_window_mins.minutes.ago
    end

    def post_action_like
      @post_action_like ||=
        PostAction.find_by(
          user_id: self.user_id,
          post_id: self.post_id,
          post_action_type_id: PostActionType.types[:like],
        )
    end

    def reload
      @post_action_like = nil
      super
    end
  end
end

# == Schema Information
#
# Table name: discourse_reactions_reaction_users
#
#  id          :bigint           not null, primary key
#  reaction_id :integer
#  user_id     :integer
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  post_id     :integer
#
# Indexes
#
#  index_discourse_reactions_reaction_users_on_reaction_id  (reaction_id)
#  reaction_id_user_id                                      (reaction_id,user_id) UNIQUE
#  user_id_post_id                                          (user_id,post_id) UNIQUE
#
