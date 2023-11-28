# frozen_string_literal: true

DiscourseReactions::Engine.routes.draw do
  namespace :api, defaults: { format: :json } do
    post "/boosts" => "boosts#create"
    delete "/boosts/:id" => "boosts#destroy"
  end

  get "/custom-reactions" => "custom_reactions#index", :constraints => { format: :json }
  put "/posts/:post_id/custom-reactions/:reaction/toggle" => "custom_reactions#toggle",
      :constraints => {
        format: :json,
      }
  get "/posts/reactions" => "custom_reactions#reactions_given", :as => "reactions_given"
  get "/posts/reactions-received" => "custom_reactions#reactions_received",
      :as => "reactions_received"
  get "/posts/:id/reactions-users" => "custom_reactions#post_reactions_users",
      :as => "post_reactions_users"
end

Discourse::Application.routes.draw { mount ::DiscourseReactions::Engine, at: "discourse-reactions" }
