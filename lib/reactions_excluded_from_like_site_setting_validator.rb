# frozen_string_literal: true

class ReactionsExcludedFromLikeSiteSettingValidator
  def initialize(opts = {})
    @opts = opts
  end

  def valid_value?(val)
    val.blank? || val == SiteSetting.defaults[:discourse_reactions_excluded_from_like] ||
      valid_emojis?(val)
  end

  def error_message
    I18n.t("site_settings.errors.invalid_excluded_emoji")
  end

  def valid_emojis?(val)
    emojis = val.to_s.split("|")
    enabled_reaction_emojis = SiteSetting.discourse_reactions_enabled_reactions.to_s.split("|")
    !emojis.include?(SiteSetting.discourse_reactions_reaction_for_like) &&
      emojis.all? { |emoji| enabled_reaction_emojis.include?(emoji) }
  end
end
