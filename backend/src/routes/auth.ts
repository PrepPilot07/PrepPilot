import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../db/pool';
import { sendOTPVerificationEmail, sendPasswordResetEmail } from '../services/email';
import { validateEmail, validatePassword, normalizeEmail } from '../utils/validation';

const router = Router();

// ─── OTP config ──────────────────────────────────────────────────────────────

const OTP_EXPIRY_MS = 15 * 60 * 1000; // codes are valid for 15 minutes
const MAX_OTP_ATTEMPTS = 5; // wrong guesses before a code is locked
const RESEND_COOLDOWN_MS = 30 * 1000; // min gap between reset emails per address

function generateOtp(): string {
  // randomInt's upper bound is exclusive, so this yields 100000–999999.
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function signToken(userId: string): string {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET as string,
    { expiresIn: '24h' }
  );
}

// ─── SIGNUP WIZARD ──────────────────────────────────────────────────────────

// Step 1: Request Signup OTP
router.post('/request-signup-otp', async (req: Request, res: Response): Promise<void> => {
  const emailCheck = validateEmail(req.body?.email);
  if (!emailCheck.valid) {
    res.status(400).json({ error: emailCheck.error });
    return;
  }

  const cleanEmail = normalizeEmail(req.body.email);

  try {
    // 1. Check if email already exists in users table
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (userCheck.rows.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    // 2. Generate OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // 3. Upsert into email_verifications
    await pool.query(
      `INSERT INTO email_verifications (email, otp_code, otp_expires_at, is_verified)
       VALUES ($1, $2, $3, FALSE)
       ON CONFLICT (email) DO UPDATE 
       SET otp_code = EXCLUDED.otp_code, 
           otp_expires_at = EXCLUDED.otp_expires_at, 
           is_verified = FALSE`,
      [cleanEmail, otpCode, otpExpiresAt]
    );

    // 4. Send Email
    await sendOTPVerificationEmail(cleanEmail, otpCode);

    res.status(200).json({ message: 'OTP sent to email.' });
  } catch (err) {
    console.error('Request signup OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Step 2: Verify Signup OTP
router.post('/verify-signup-otp', async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ error: 'Email and OTP are required' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    const result = await pool.query(
      'SELECT otp_code, otp_expires_at, is_verified FROM email_verifications WHERE email = $1',
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No pending verification found for this email.' });
      return;
    }

    const record = result.rows[0];

    if (record.otp_code !== otp) {
      res.status(401).json({ error: 'Invalid verification code' });
      return;
    }

    if (new Date() > new Date(record.otp_expires_at)) {
      res.status(401).json({ error: 'Verification code has expired. Please request a new one.' });
      return;
    }

    // Mark as verified
    await pool.query(
      'UPDATE email_verifications SET is_verified = TRUE WHERE email = $1',
      [cleanEmail]
    );

    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (err) {
    console.error('Verify signup OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Step 3: Complete Signup
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body ?? {};

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    res.status(400).json({ error: emailCheck.error });
    return;
  }
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    res.status(400).json({ error: passwordCheck.error });
    return;
  }

  const cleanEmail = normalizeEmail(email);

  try {
    // 1. Verify that the email is actually verified in email_verifications
    const verifyCheck = await pool.query(
      'SELECT is_verified FROM email_verifications WHERE email = $1',
      [cleanEmail]
    );

    if (verifyCheck.rows.length === 0 || !verifyCheck.rows[0].is_verified) {
      res.status(403).json({ error: 'Email is not verified.' });
      return;
    }

    // 2. Hash password and insert user
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, is_verified)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, email, name, created_at`,
      [cleanEmail, passwordHash, name?.trim() || null]
    );

    const user = result.rows[0];

    // 3. Clean up the email_verifications table
    await pool.query('DELETE FROM email_verifications WHERE email = $1', [cleanEmail]);

    // 4. Log the user in
    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.created_at },
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === '23505') {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── POST /auth/login ────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id, email, name, password_hash, is_verified FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    
    if (!user.is_verified) {
      res.status(403).json({ error: 'Please verify your email address.', verificationRequired: true });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken(user.id);
    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── LOGIN OTP VERIFICATION (For existing unverified users) ──────────────────

router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ error: 'Email and OTP are required' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id, email, name, otp_code, otp_expires_at FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    
    if (user.otp_code !== otp) {
      res.status(401).json({ error: 'Invalid verification code' });
      return;
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      res.status(401).json({ error: 'Verification code has expired. Please request a new one.' });
      return;
    }

    // Mark as verified
    await pool.query(
      'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    const token = signToken(user.id);
    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/resend-otp', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  try {
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // This updates the users table (for existing unverified users from login)
    // To also support resend from the new signup flow, we can check email_verifications too!
    let targetEmail = email.toLowerCase().trim();
    
    // First try to update users table
    const result = await pool.query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE email = $3 RETURNING email',
      [otpCode, otpExpiresAt, targetEmail]
    );

    if (result.rows.length > 0) {
      await sendOTPVerificationEmail(result.rows[0].email, otpCode);
      res.status(200).json({ message: 'Verification code resent' });
      return;
    }

    // If not in users, try email_verifications
    const result2 = await pool.query(
      'UPDATE email_verifications SET otp_code = $1, otp_expires_at = $2 WHERE email = $3 RETURNING email',
      [otpCode, otpExpiresAt, targetEmail]
    );

    if (result2.rows.length > 0) {
      await sendOTPVerificationEmail(result2.rows[0].email, otpCode);
      res.status(200).json({ message: 'Verification code resent' });
      return;
    }

    res.status(404).json({ error: 'Account not found' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
//
// Three steps mirror the signup wizard:
//   1. POST /auth/forgot-password  → email a reset code
//   2. POST /auth/verify-reset-otp → confirm the code (UX gate)
//   3. POST /auth/reset-password   → set the new password (re-checks the code)
//
// The request step never reveals whether an account exists (no user
// enumeration); every failure path returns the same generic message. Codes are
// stored hashed, expire in 15 minutes, and lock after MAX_OTP_ATTEMPTS wrong
// guesses so the 6-digit space can't be brute-forced.

// Step 1: Request a password reset code
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const emailCheck = validateEmail(req.body?.email);
  if (!emailCheck.valid) {
    res.status(400).json({ error: emailCheck.error });
    return;
  }

  const cleanEmail = normalizeEmail(req.body.email);
  // Same response whether or not the account exists — avoids leaking which
  // emails are registered.
  const genericMessage =
    'If an account exists for that email, a password reset code has been sent.';

  try {
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (userRes.rows.length === 0) {
      res.status(200).json({ message: genericMessage });
      return;
    }

    // Throttle repeat sends to the same address (defends against email bombing).
    const existing = await pool.query(
      'SELECT last_sent_at FROM password_resets WHERE email = $1',
      [cleanEmail]
    );
    if (existing.rows.length > 0) {
      const lastSent = new Date(existing.rows[0].last_sent_at).getTime();
      if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
        res.status(200).json({ message: genericMessage });
        return;
      }
    }

    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await pool.query(
      `INSERT INTO password_resets (email, otp_hash, otp_expires_at, attempts, verified, last_sent_at)
       VALUES ($1, $2, $3, 0, FALSE, NOW())
       ON CONFLICT (email) DO UPDATE
       SET otp_hash = EXCLUDED.otp_hash,
           otp_expires_at = EXCLUDED.otp_expires_at,
           attempts = 0,
           verified = FALSE,
           last_sent_at = NOW()`,
      [cleanEmail, hashOtp(otpCode), otpExpiresAt]
    );

    // A transport failure must not reveal that the account exists, so log it
    // and still return the generic success response.
    try {
      await sendPasswordResetEmail(cleanEmail, otpCode);
    } catch (mailErr) {
      console.error('Failed to send password reset email:', mailErr);
    }

    res.status(200).json({ message: genericMessage });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Step 2: Verify the reset code
router.post('/verify-reset-otp', async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body ?? {};
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid || typeof otp !== 'string' || !otp.trim()) {
    res.status(400).json({ error: 'Email and verification code are required' });
    return;
  }

  const cleanEmail = normalizeEmail(email);

  try {
    const result = await pool.query(
      'SELECT otp_hash, otp_expires_at, attempts FROM password_resets WHERE email = $1',
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Invalid or expired verification code. Please request a new one.' });
      return;
    }

    const record = result.rows[0];

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
      return;
    }

    if (new Date() > new Date(record.otp_expires_at)) {
      res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      return;
    }

    if (record.otp_hash !== hashOtp(otp.trim())) {
      await pool.query('UPDATE password_resets SET attempts = attempts + 1 WHERE email = $1', [cleanEmail]);
      const remaining = MAX_OTP_ATTEMPTS - (record.attempts + 1);
      res.status(401).json({
        error:
          remaining > 0
            ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Invalid verification code. Please request a new code.',
      });
      return;
    }

    await pool.query('UPDATE password_resets SET verified = TRUE WHERE email = $1', [cleanEmail]);
    res.status(200).json({ message: 'Verification successful. You can now set a new password.' });
  } catch (err) {
    console.error('Verify reset OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Step 3: Set the new password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { email, otp, new_password } = req.body ?? {};

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid || typeof otp !== 'string' || !otp.trim()) {
    res.status(400).json({ error: 'Email and verification code are required' });
    return;
  }
  const passwordCheck = validatePassword(new_password);
  if (!passwordCheck.valid) {
    res.status(400).json({ error: passwordCheck.error });
    return;
  }

  const cleanEmail = normalizeEmail(email);

  try {
    const result = await pool.query(
      'SELECT otp_hash, otp_expires_at, attempts, verified FROM password_resets WHERE email = $1',
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Invalid or expired reset request. Please start over.' });
      return;
    }

    const record = result.rows[0];

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
      return;
    }

    if (new Date() > new Date(record.otp_expires_at)) {
      res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      return;
    }

    if (!record.verified) {
      res.status(403).json({ error: 'Please verify the code sent to your email first.' });
      return;
    }

    // Re-check the code at the final step so a "verified" row can't be used
    // without presenting the actual OTP.
    if (record.otp_hash !== hashOtp(otp.trim())) {
      await pool.query('UPDATE password_resets SET attempts = attempts + 1 WHERE email = $1', [cleanEmail]);
      res.status(401).json({ error: 'Invalid verification code.' });
      return;
    }

    const passwordHash = await bcrypt.hash(new_password, 12);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const upd = await client.query(
        'UPDATE users SET password_hash = $2 WHERE email = $1 RETURNING id',
        [cleanEmail, passwordHash]
      );

      if (upd.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Account not found.' });
        return;
      }

      // Consume the reset so the code can't be replayed.
      await client.query('DELETE FROM password_resets WHERE email = $1', [cleanEmail]);
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.status(200).json({ success: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
