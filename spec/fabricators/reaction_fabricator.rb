# frozen_string_literal: true

Fabricator(:reaction, class_name: 'DiscourseReactions::Reaction') do
  post { |attrs| attrs[:post] }
  user { |attrs| attrs[:user] }
  reaction_type 0
  reaction_value 'otter'
end
