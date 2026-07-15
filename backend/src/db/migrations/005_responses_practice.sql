-- Migration 005: Create responses table for practice answers
-- Run via: npm run migrate:responses

-- Drop the old responses table from schema.sql if it exists (it was never populated)
DROP TABLE IF EXISTS responses CASCADE;

CREATE TABLE responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  roadmap_id   UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  answer_text  TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  score        INT CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_question_id ON responses(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_roadmap_id ON responses(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_responses_submitted_at ON responses(user_id, submitted_at);
