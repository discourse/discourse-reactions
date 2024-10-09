# frozen_string_literal: true

RSpec.configure do |config|
  config.before(:suite) do
    if defined?(migrate_column_to_bigint)
      migrate_column_to_bigint(DiscourseReactions::ReactionUser, :reaction_id)
    end
  end
end
