import pool from '../db/pool';

// Notification types backed by a real event today. 'streak' and 'whatsapp' are
// reserved for when those features generate events (see migration 008).
export type NotificationType = 'answer_scored' | 'day_unlocked' | 'streak' | 'whatsapp';

/**
 * Insert a notification for a user. Best-effort by design: a failure here must
 * never break the primary action (answer scoring, day completion) that
 * triggered it, so errors are logged and swallowed rather than thrown.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  relatedId: string | null = null
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, related_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, type, message, relatedId]
    );
  } catch (err) {
    console.error('[notifications] create error:', err);
  }
}
