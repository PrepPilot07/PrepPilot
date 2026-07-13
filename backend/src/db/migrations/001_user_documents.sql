-- Migration: add user_documents table and has_uploaded_documents flag
-- Run via: npm run migrate:upload  (or psql $DATABASE_URL -f this file)

CREATE TABLE IF NOT EXISTS user_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parsed_resume  JSONB,
  parsed_jd      JSONB,
  uploaded_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS has_uploaded_documents BOOLEAN DEFAULT FALSE;
