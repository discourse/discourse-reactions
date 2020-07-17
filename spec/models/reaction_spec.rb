# frozen_string_literal: true

require 'rails_helper'
require_relative '../fabricators/reaction_fabricator.rb'

describe DiscourseReactions::Reaction do
  it 'knows which reactions are valid' do
    SiteSetting.discourse_reactions_enabled_reactions = "laughing|heart|-open_mouth|-cry|-angry|thumbsup|-thumbsdown"
    expect(described_class.valid_reactions).to eq(%w(laughing heart open_mouth cry angry thumbsup thumbsdown).to_set)
  end
end
