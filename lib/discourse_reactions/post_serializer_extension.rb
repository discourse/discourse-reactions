# require_relative "../../../discourse/app/serializers/post_item_excerpt"

module DiscourseReactions::PostSerializerExtension
  extend ActiveSupport::Concern

  def self.prepended(base)
    base.attributes :reaction_data
    # base.include PostItemExcerpt
  end

  def include_reaction_data?
    object.reactions
  end

  def cooked
    @cooked ||= object.cooked || PrettyText.cook(object.raw)
  end

  def excerpt
    byebug
    return nil unless cooked
    @excerpt ||= PrettyText.excerpt(cooked, 300, keep_emoji_images: true)
  end

  def reaction_data
    filtered_reaction = object.association(:reactions).target.first

    filtered_reaction ? ReactionSerializer.new(filtered_reaction).as_json : nil
  end
end
