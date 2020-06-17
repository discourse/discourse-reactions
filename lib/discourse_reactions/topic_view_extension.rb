# frozen_string_literal: true

module DiscourseReactions::TopicViewExtension
  def filter_post_types(posts)
    return super(posts) unless SiteSetting.discourse_reactions_enabled
    super(posts).includes(reactions: { reaction_users: :user })
  end
end
