import { Router, Response } from 'express';
import pool from '../db/pool';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// How many notifications the header dropdown fetches at once.
const FEED_LIMIT = 30;

// ── GET /api/notifications ────────────────────────────────────────────────────
// Newest-first feed for the current user plus the current unread count (used for
// the bell badge). Kept to FEED_LIMIT rows — this is a header dropdown, not a
// full history view.

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const listRes = await pool.query(
      `SELECT id, type, message, related_id, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, FEED_LIMIT]
    );

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS unread_count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    res.json({
      notifications: listRes.rows,
      unread_count: countRes.rows[0].unread_count,
    });
  } catch (err) {
    console.error('[notifications] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ── POST /api/notifications/read-all ──────────────────────────────────────────
// Mark every unread notification for the user as read. Declared before the
// parameterised :id route so "read-all" isn't captured as an id.

router.post('/read-all', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    res.json({ success: true, unread_count: 0 });
  } catch (err) {
    console.error('[notifications] POST read-all error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// ── POST /api/notifications/:id/read ──────────────────────────────────────────
// Mark a single notification read. Scoped by user_id so one user can't touch
// another's rows.

router.post('/:id/read', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const updateRes = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );

    if (updateRes.rows.length === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[notifications] POST read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

export default router;
