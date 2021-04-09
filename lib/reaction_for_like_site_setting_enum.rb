# frozen_string_literal: true

require_dependency 'enum_site_setting'

class ReactionForLikeSiteSettingEnum < EnumSiteSetting
  HEART ||= 'heart'

  def self.valid_value?(val)
    values.any? { |v| v[:value] == val }
  end

  def self.values
    @values ||= begin
      reactions = SiteSetting.discourse_reactions_enabled_reactions.split('|').map do |reaction|
        { name: reaction, value: reaction }
      end

      [{ name: HEART, value: HEART }].concat(reactions)
    end
  end
end
