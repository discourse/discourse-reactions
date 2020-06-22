# frozen_string_literal: true

require 'rails_helper'
require_relative '../fabricators/reaction_fabricator.rb'

describe DiscourseReactions::Reaction do
  it 'knows which reactions are positive and which are negative' do
    SiteSetting.discourse_reactions_enabled_reactions = "laughing|heart|-open_mouth|-cry|-angry|thumbsup|-thumbsdown"
    expect(described_class.valid_reactions).to eq(%w(laughing heart open_mouth cry angry thumbsup thumbsdown).to_set)
    expect(described_class.positive_reactions).to eq(%w(laughing heart thumbsup).to_set)
    expect(described_class.negative_or_neutral_reactions).to eq(%w(open_mouth cry angry thumbsdown).to_set)
  end

  it 'positive and negative scopes' do
    thumbsup = Fabricate(:reaction, reaction_value: 'thumbsup')
    thumbsdown = Fabricate(:reaction, reaction_value: 'thumbsdown')
    expect(described_class.positive).to eq([thumbsup])
    expect(described_class.negative_or_neutral).to eq([thumbsdown])
  end
end
