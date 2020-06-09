# frozen_string_literal: true

module DiscourseReactions
  class DiscourseReactionsController < ::ApplicationController
    requires_plugin :discourse_reactions
  end
end
