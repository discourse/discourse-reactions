# frozen_string_literal: true

first_reaction_query = <<-EOS
SELECT  pa1.user_id, pa1.created_at granted_at, pa1.post_id
FROM (
  SELECT ru.user_id, min(ru.id) id
  FROM discourse_reactions_reaction_users ru
  INNER JOIN discourse_reactions_reactions r
  ON r.id = ru.reaction_id
  WHERE :backfill OR ru.post_id IN (:post_ids)
  GROUP BY ru.user_id
) x
INNER JOIN discourse_reactions_reaction_users pa1 on pa1.id = x.id
EOS

Badge.seed do |b|
  b.name = I18n.t("badges.first_reaction.name")
  b.description = I18n.t("badges.first_reaction.description")
  b.long_description = I18n.t("badges.first_reaction.long_description")
  b.icon = "far-smile"
  b.badge_type_id = BadgeType::Bronze
  b.multiple_grant = false
  b.target_posts = true
  b.show_posts = true
  b.query = first_reaction_query
  b.default_badge_grouping_id = BadgeGrouping::GettingStarted
  b.trigger = Badge::Trigger::PostRevision
  b.system = true
end
