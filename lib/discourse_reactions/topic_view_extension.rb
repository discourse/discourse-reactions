# frozen_string_literal: true

module DiscourseReactions::TopicViewExtension
  def filter_post_types(posts)
    return super(posts) unless SiteSetting.discourse_reactions_enabled
    super(posts).includes(reactions: { reaction_users: :user }).group('posts.id')
  end

  def highest_post_number
    reutrn super unless SiteSetting.discourse_reactions_enabled
    super.is_a?(Hash) ? super.values[0] : super
  end
end
