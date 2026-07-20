CREATE TABLE IF NOT EXISTS email_verifications (
  email            TEXT PRIMARY KEY,
  otp_code         TEXT NOT NULL,
  otp_expires_at   TIMESTAMPTZ NOT NULL,
  is_verified      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
