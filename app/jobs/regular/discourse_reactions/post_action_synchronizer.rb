# frozen_string_literal: true

module Jobs
  module DiscourseReactions
    class PostActionSynchronizer < ::Jobs::Base
      def execute(args = {})
        ::DiscourseReactions::ReactionPostActionSynchronizer.sync!
      end
    end
  end
end
