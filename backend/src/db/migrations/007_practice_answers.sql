-- Migration 007: per-question practice answers + AI scoring.
-- These answers are for the individual practice questions that live inside each
-- day's `practice_questions` JSONB (shape: { id, text, difficulty }). The
-- question_id here is that JSONB item's id (a string), NOT a row in `questions`,
-- so it is stored as TEXT with no FK. day_id references the roadmap day row.
--
-- Kept separate from `responses` (which is per-day and drives the dashboard
-- readiness score) so the two concerns don't collide.
-- Run via: npm run migrate:practice-answers

CREATE TABLE IF NOT EXISTS practice_answers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_id       UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL,                         -- id of the practice question inside practice_questions JSONB
  answer_text  TEXT NOT NULL,
  source       VARCHAR(20) NOT NULL DEFAULT 'web',    -- 'web' | 'whatsapp'
  ai_score     INT CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 10)),
  ai_feedback  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_answers_user_id ON practice_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_day_id ON practice_answers(day_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_question ON practice_answers(user_id, question_id);
