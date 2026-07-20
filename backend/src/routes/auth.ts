import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../db/pool';
import { sendOTPVerificationEmail } from '../services/email';

const router = Router();

// ─── Email / password validators ────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
  const { email } = req.body;
  if (!email || !isValidEmail(email)) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();

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
  const { email, password, name } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();

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

export default router;
