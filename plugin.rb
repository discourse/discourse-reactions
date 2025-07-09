# frozen_string_literal: true

# name: discourse-reactions
# about: Allows users to react to a post with emojis.
# meta_topic_id: 183261
# version: 0.5
# author: Ahmed Gagan, Rafael dos Santos Silva, Kris Aubuchon, Joffrey Jaffeux, Kris Kotlarek, Jordan Vidrine
# url: https://github.com/discourse/discourse-reactions

after_initialize do
  AdminDashboardData.add_problem_check do
    "The discourse-reactions plugin has been integrated into discourse core. Please remove the plugin from your app.yml and rebuild your container."
  end
end
