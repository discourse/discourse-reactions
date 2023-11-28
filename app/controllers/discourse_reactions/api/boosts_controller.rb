# frozen_string_literal: true

class DiscourseReactions::Api::BoostsController < DiscourseReactions::ApiController
  def create
    raise Discourse::InvalidParameters.new("post_id") if !params["post_id"]
    raise Discourse::InvalidParameters.new("raw") if !params["raw"]

    DiscourseReactions::CreateBoost.call(params["post_id"], params["raw"], current_user)
  end

  def destroy
    DiscourseReactions::DeleteBoost.call(params["id"], current_user)
  end
end
