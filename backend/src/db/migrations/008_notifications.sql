-- Migration 008: in-app notifications feed.
-- One row per notification shown in the header bell dropdown. Records are
-- generated at the point each real event already happens (answer scored, next
-- day unlocked) rather than by a polling job. `related_id` is an optional,
-- loosely-typed pointer to the entity that triggered it (a day/question id,
-- etc.) and is stored as TEXT with no FK so any event source can reuse it.
--
-- `type` values in use today: 'answer_scored' | 'day_unlocked'.
-- Reserved for later: 'streak' | 'whatsapp'.
-- Run via: npm run migrate:notifications

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(30) NOT NULL,   -- 'answer_scored' | 'day_unlocked' | 'streak' | 'whatsapp'
  message     TEXT NOT NULL,
  related_id  TEXT,                   -- optional: day id, answer id, etc. (no FK — source-agnostic)
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Feed query: newest-first per user.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
-- Unread-count query.
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
