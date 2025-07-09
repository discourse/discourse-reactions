# frozen_string_literal: true

# name: discourse-reactions
# about: Allows users to react to a post with emojis.
# meta_topic_id: 183261
# version: 0.5
# author: Ahmed Gagan, Rafael dos Santos Silva, Kris Aubuchon, Joffrey Jaffeux, Kris Kotlarek, Jordan Vidrine
# url: https://github.com/discourse/discourse-reactions

after_initialize do
  require_relative "app/services/problem_check/deprecation"
  register_problem_check ProblemCheck::Deprecation
end
