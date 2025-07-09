# frozen_string_literal: true

class ProblemCheck::Deprecation < ProblemCheck
  self.priority = "high"

  def call
    problem
  end
end
