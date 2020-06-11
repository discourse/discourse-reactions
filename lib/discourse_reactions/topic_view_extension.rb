# frozen_string_literal: true

module DiscourseReactions::TopicViewExtension
  def filter_posts_by_ids(post_ids)
    return super(post_ids) unless SiteSetting.discourse_reactions_enabled
    super(post_ids).includes(reactions: [:user])
  end
end
