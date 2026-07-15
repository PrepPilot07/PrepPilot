import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool';

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

// ─── POST /auth/signup ───────────────────────────────────────────────────────

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;

  // Validation
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email.toLowerCase().trim(), passwordHash, name?.trim() || null]
    );

    const user = result.rows[0];
    const token = signToken(user.id);

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.created_at },
    });
  } catch (err: unknown) {
    // Postgres unique_violation error code
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
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
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
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

export default router;
