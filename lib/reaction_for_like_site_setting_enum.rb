# frozen_string_literal: true

require_dependency 'enum_site_setting'

class ReactionForLikeSiteSettingEnum < EnumSiteSetting
  def self.valid_value?(val)
    values.any? { |v| v[:value] == val }
  end

  def self.values
    @values = begin
      reactions = DiscourseReactions::Reaction.valid_reactions.map do |reaction|
        { name: reaction, value: reaction }
      end
    end
  end
end
