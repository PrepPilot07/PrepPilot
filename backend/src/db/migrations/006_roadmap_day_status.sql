-- Migration 006: add per-day status + practice content to the questions table.
-- The `questions` table already acts as the per-day roadmap table (one row per
-- day). This adds the columns needed for the "Practice Here" flow and for
-- locking/unlocking days as the user completes them.
-- Run via: npm run migrate:day-status

-- ─── New columns ──────────────────────────────────────────────────────────────
-- status:            'locked' | 'today' | 'completed'
-- resources:         [{ title, url }]                curated learning links
-- practice_questions:[{ id, text, difficulty }]      reusable question set (web + WhatsApp)
-- completed_at:      when the day was marked complete
ALTER TABLE questions ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'locked';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS resources JSONB NOT NULL DEFAULT '[]';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS practice_questions JSONB NOT NULL DEFAULT '[]';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(roadmap_id, status);

-- ─── Backfill status from existing data ───────────────────────────────────────
-- 1) Any day that already has a submitted response counts as completed, so the
--    Roadmap page stays consistent with what the user did on the Dashboard.
UPDATE questions q
SET status = 'completed',
    completed_at = COALESCE(q.completed_at, NOW())
WHERE q.status <> 'completed'
  AND EXISTS (SELECT 1 FROM responses r WHERE r.question_id = q.id);

-- 2) For each roadmap with no active day yet, promote the lowest-numbered
--    remaining locked day to 'today'.
WITH next_locked AS (
  SELECT DISTINCT ON (roadmap_id) id, roadmap_id
  FROM questions
  WHERE status = 'locked'
  ORDER BY roadmap_id, day_number ASC
)
UPDATE questions q
SET status = 'today'
FROM next_locked nl
WHERE q.id = nl.id
  AND NOT EXISTS (
    SELECT 1 FROM questions q2
    WHERE q2.roadmap_id = nl.roadmap_id
      AND q2.status IN ('today', 'up_next')
  );
