-- Migration 009: tie each roadmap to the analysis it was generated from, and
-- close the user_documents schema drift.
-- Run via: npm run migrate:roadmap-link
--
-- Two problems this fixes:
--
-- 1. user_documents.user_id has a UNIQUE constraint in the live dev DB but in NO
--    migration. On a DB built from migrations alone, upload's
--    `INSERT ... ON CONFLICT DO NOTHING` has no constraint to conflict against,
--    so every upload inserts a duplicate row and
--    `ORDER BY uploaded_at DESC LIMIT 1` becomes nondeterministic.
--
-- 2. roadmaps had no link to the analysis it came from, so a roadmap left behind
--    by a failed regeneration was indistinguishable from a current one.

-- ─── 1. user_documents: one row per user, for real ────────────────────────────

-- Collapse any pre-existing duplicates onto the newest row before adding the
-- constraint, otherwise the ALTER fails on dirty data.
DELETE FROM user_documents a
USING user_documents b
WHERE a.user_id = b.user_id
  AND (a.uploaded_at, a.id) < (b.uploaded_at, b.id);

ALTER TABLE user_documents
  DROP CONSTRAINT IF EXISTS user_documents_user_id_unique;

ALTER TABLE user_documents
  ADD CONSTRAINT user_documents_user_id_unique UNIQUE (user_id);

-- ─── 2. roadmaps: remember which analysis produced this plan ──────────────────

-- Mirrors user_documents.uploaded_at of the analysis used to build the roadmap.
-- A roadmap is stale when this doesn't match the user's current analysis.
ALTER TABLE roadmaps
  ADD COLUMN IF NOT EXISTS analysis_uploaded_at TIMESTAMPTZ;

-- Backfill the roadmaps we can attribute with confidence. upload.ts generates a
-- roadmap immediately after upserting the analysis, so a roadmap created AFTER
-- the analysis on file was necessarily built from it. Without this, every
-- existing user would be told their (perfectly good) plan is stale.
UPDATE roadmaps r
SET analysis_uploaded_at = ud.uploaded_at
FROM user_documents ud
WHERE ud.user_id = r.user_id
  AND r.analysis_uploaded_at IS NULL
  AND r.created_at >= ud.uploaded_at;

-- Anything still NULL is a roadmap that predates its analysis — exactly the bug
-- being fixed — or can't be attributed. It stays NULL and reads as stale, which
-- is the safe default: prompt a rebuild rather than silently trust an old plan.
