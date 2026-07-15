import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /profile/me — protected route
router.get('/me', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, whatsapp_number, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];

    // Fetch role_title from the latest analysis report
    const docRes = await pool.query(
      `SELECT analysis_report FROM user_documents WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1`,
      [req.userId]
    );
    const analysisReport = docRes.rows[0]?.analysis_report as Record<string, unknown> | undefined;
    const jd = analysisReport?.jd as { role_title?: string } | undefined;
    const roleTitle = jd?.role_title || null;

    res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      roleTitle,
      whatsappNumber: user.whatsapp_number,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /profile — update name
router.put('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE users SET name = $2 WHERE id = $1 RETURNING id, email, name`,
      [req.userId, name.trim()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /profile/password — change password
router.patch('/password', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    res.status(400).json({ error: 'Current password and new password are required' });
    return;
  }

  if (new_password.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const match = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!match) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const newHash = await bcrypt.hash(new_password, 12);
    await pool.query(
      'UPDATE users SET password_hash = $2 WHERE id = $1',
      [req.userId, newHash]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /profile — delete account (requires password confirmation)
router.delete('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'Password is required to confirm account deletion' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const match = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!match) {
      res.status(401).json({ error: 'Incorrect password' });
      return;
    }

    // Delete user — ON DELETE CASCADE handles all related tables
    await pool.query('DELETE FROM users WHERE id = $1', [req.userId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
