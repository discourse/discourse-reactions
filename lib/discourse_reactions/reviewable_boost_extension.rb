# frozen_string_literal: true

module DiscourseReactions
  module ReviewableBoostExtension
    extend ActiveSupport::Concern

    prepended { include TypeMappable }

    class_methods do
      def sti_class_mapping = { "ReviewableBoost" => DiscourseReactions::ReviewableBoost }
      def polymorphic_class_mapping = { "Boost" => DiscourseReactions::Boost }
    end
  end
end
