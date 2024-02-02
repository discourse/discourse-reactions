# frozen_string_literal: true

Fabricator(:reaction_user, class_name: "DiscourseReactions::ReactionUser") do
  reaction { |attrs| attrs[:reaction] }
  user { |attrs| attrs[:user] }
  post { |attrs| attrs[:post] }

  after_create do |reaction_user|
    if DiscourseReactions::Reaction.reactions_counting_as_like.include?(
         reaction_user.reaction.reaction_value,
       )
      Fabricate(
        :post_action,
        user: reaction_user.user,
        post: reaction_user.post,
        post_action_type_id: PostActionType.types[:like],
      )
    end
  end
end
