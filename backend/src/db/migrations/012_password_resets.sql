-- Password reset OTPs — one pending reset per email.
-- Separate from email_verifications (signup) so the two flows never collide.
-- otp_hash stores a SHA-256 hash of the 6-digit code, never the code itself.
CREATE TABLE IF NOT EXISTS password_resets (
  email           TEXT PRIMARY KEY,
  otp_hash        TEXT NOT NULL,
  otp_expires_at  TIMESTAMPTZ NOT NULL,
  attempts        INT NOT NULL DEFAULT 0,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  last_sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
