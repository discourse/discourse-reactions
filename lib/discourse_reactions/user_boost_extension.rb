# frozen_string_literal: true

module DiscourseReactions
  module UserBoostExtension
    def self.included(base)
      base.has_many :boosts
      base.extend(ClassMethods)
    end

    module ClassMethods
      def boost_allowed
        allowed_groups = SiteSetting.discourse_reactions_boosts_allowed_groups.split("|")

        # The UNION against admin users is necessary because bot users like the system user are given the admin status but
        # are not added into the admin group.
        where(
          "users.id IN (
      SELECT
        user_id
      FROM group_users
      WHERE group_users.group_id IN (?)

      UNION

      SELECT id
      FROM users
      WHERE users.admin
    )",
          allowed_groups,
        )
      end
    end
  end
end
