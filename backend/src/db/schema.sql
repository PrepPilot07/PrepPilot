-- PrepPilot Database Schema
-- Run via: psql $DATABASE_URL -f src/db/schema.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('question', 'answer', 'feedback', 'nudge', 'report', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── TABLES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_verifications (
  email            TEXT PRIMARY KEY,
  otp_code         TEXT NOT NULL,
  otp_expires_at   TIMESTAMPTZ NOT NULL,
  is_verified      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset OTPs — one pending reset per email. otp_hash is a SHA-256
-- digest of the 6-digit code (never stored in plaintext). Kept separate from
-- email_verifications so the signup and reset flows never interfere.
CREATE TABLE IF NOT EXISTS password_resets (
  email            TEXT PRIMARY KEY,
  otp_hash         TEXT NOT NULL,
  otp_expires_at   TIMESTAMPTZ NOT NULL,
  attempts         INT NOT NULL DEFAULT 0,
  verified         BOOLEAN NOT NULL DEFAULT FALSE,
  last_sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  whatsapp_number  TEXT,
  is_verified      BOOLEAN DEFAULT FALSE,
  otp_code         TEXT,
  otp_expires_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_raw_text TEXT,
  jd_raw_text     TEXT,
  parsed_skills   JSONB,
  flagged_fields  JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

CREATE TABLE IF NOT EXISTS roadmaps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topics          JSONB NOT NULL DEFAULT '[]',
  interview_date  DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roadmaps_profile_id ON roadmaps(profile_id);

CREATE TABLE IF NOT EXISTS questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id    UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  topic         TEXT NOT NULL,
  question_text TEXT NOT NULL,
  learning_goal TEXT,
  sent_at       TIMESTAMPTZ,
  day_number    INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_roadmap_id ON questions(roadmap_id);

CREATE TABLE IF NOT EXISTS responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id       UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text       TEXT NOT NULL,
  score             INT CHECK (score BETWEEN 0 AND 100),
  strengths         TEXT,
  gaps              TEXT,
  recommended_topic TEXT,
  answered_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_question_id ON responses(question_id);

CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction    message_direction NOT NULL,
  message_type message_type NOT NULL,
  content      TEXT NOT NULL,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at  ON messages(sent_at);
