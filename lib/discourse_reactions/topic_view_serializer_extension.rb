# frozen_string_literal: true

module DiscourseReactions::TopicViewSerializerExtension
  def posts
    object.instance_variable_set(:@posts, object.posts.includes(reactions: { reaction_users: :user })) if SiteSetting.discourse_reactions_enabled
    super
  end
end
