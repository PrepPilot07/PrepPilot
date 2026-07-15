import { Router, Response } from 'express';
import pool from '../db/pool';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { generatePracticeContent } from '../services/practiceContent';

const router = Router();

// ── GET /api/roadmap ──────────────────────────────────────────────────────────

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    // Fetch the user's roadmap metadata
    const roadmapRes = await pool.query(
      `SELECT id, user_id, interview_date, created_at
       FROM roadmaps
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (roadmapRes.rows.length === 0) {
      res.status(404).json({ error: 'No roadmap found. Upload your resume and JD to generate one.' });
      return;
    }

    const roadmap = roadmapRes.rows[0];
    const roadmapId = roadmap.id as string;

    // Fetch all questions (one per day) ordered by day
    const questionsRes = await pool.query(
      `SELECT id, day_number, topic, question_text, learning_goal, difficulty, focus_skill,
              status, resources, practice_questions, completed_at, sent_at
       FROM questions
       WHERE roadmap_id = $1
       ORDER BY day_number ASC`,
      [roadmapId]
    );

    const completed_count = questionsRes.rows.filter((r) => r.status === 'completed').length;

    res.json({
      roadmap_id: roadmapId,
      interview_date: roadmap.interview_date,
      created_at: roadmap.created_at,
      completed_count,
      days: questionsRes.rows.map((row) => ({
        id: row.id,
        day_number: row.day_number,
        topic: row.topic,
        question_text: row.question_text,
        learning_goal: row.learning_goal,
        difficulty: row.difficulty,
        focus_skill: row.focus_skill,
        status: row.status,
        completed_at: row.completed_at,
        sent_at: row.sent_at,
        // True once practice content has been generated & persisted for this day,
        // so the frontend only shows a loading state when it actually needs to.
        has_practice_content:
          Array.isArray(row.resources) && row.resources.length > 0 &&
          Array.isArray(row.practice_questions) && row.practice_questions.length > 0,
      })),
    });
  } catch (err) {
    console.error('[roadmap] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch roadmap' });
  }
});

// ── GET /api/roadmap/:dayId/practice ──────────────────────────────────────────
// Returns overview + curated resources + practice questions for a single day.
// Generates & persists content on first access. Locked days are rejected (403)
// so gating can't be bypassed by hitting the API directly.

router.get('/:dayId/practice', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { dayId } = req.params;

  try {
    const dayRes = await pool.query(
      `SELECT q.id, q.topic, q.learning_goal, q.focus_skill, q.status,
              q.resources, q.practice_questions
       FROM questions q
       JOIN roadmaps r ON r.id = q.roadmap_id
       WHERE q.id = $1 AND r.user_id = $2`,
      [dayId, userId]
    );

    if (dayRes.rows.length === 0) {
      res.status(404).json({ error: 'Day not found or does not belong to your roadmap' });
      return;
    }

    const day = dayRes.rows[0];

    if (day.status === 'locked') {
      res.status(403).json({ error: 'This day is locked. Complete earlier days first.' });
      return;
    }

    let resources = Array.isArray(day.resources) ? day.resources : [];
    let questions = Array.isArray(day.practice_questions) ? day.practice_questions : [];

    // Generate + persist on first access so we don't re-hit the AI every open.
    if (resources.length === 0 || questions.length === 0) {
      const content = await generatePracticeContent(day.topic, day.focus_skill, day.learning_goal);
      resources = content.resources;
      questions = content.questions;

      await pool.query(
        `UPDATE questions SET resources = $2, practice_questions = $3 WHERE id = $1`,
        [dayId, JSON.stringify(resources), JSON.stringify(questions)]
      );
    }

    res.json({
      id: day.id,
      topic: day.topic,
      description: day.learning_goal,
      resources,
      questions,
    });
  } catch (err) {
    console.error('[roadmap] GET practice error:', err);
    res.status(500).json({ error: 'Failed to load practice content' });
  }
});

// ── POST /api/roadmap/:dayId/complete ─────────────────────────────────────────
// Marks a day complete and unlocks the next day. Wrapped in a transaction so the
// two status updates can't half-apply.

router.post('/:dayId/complete', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { dayId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the row while we read-modify-write it.
    const dayRes = await client.query(
      `SELECT q.id, q.roadmap_id, q.day_number, q.status
       FROM questions q
       JOIN roadmaps r ON r.id = q.roadmap_id
       WHERE q.id = $1 AND r.user_id = $2
       FOR UPDATE OF q`,
      [dayId, userId]
    );

    if (dayRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Day not found or does not belong to your roadmap' });
      return;
    }

    const day = dayRes.rows[0];

    if (day.status === 'locked') {
      await client.query('ROLLBACK');
      res.status(403).json({ error: 'This day is locked and cannot be completed.' });
      return;
    }
    if (day.status === 'completed') {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'This day is already completed.' });
      return;
    }

    // Mark this day complete.
    const updatedRes = await client.query(
      `UPDATE questions
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1
       RETURNING id, day_number, topic, status, completed_at`,
      [dayId]
    );

    // Unlock the next locked day (lowest day_number greater than this one).
    const nextRes = await client.query(
      `UPDATE questions
       SET status = 'today'
       WHERE id = (
         SELECT id FROM questions
         WHERE roadmap_id = $1 AND day_number > $2 AND status = 'locked'
         ORDER BY day_number ASC
         LIMIT 1
       )
       RETURNING id, day_number, topic, status`,
      [day.roadmap_id, day.day_number]
    );

    // Recompute the completed counter within the same transaction.
    const countRes = await client.query(
      `SELECT COUNT(*)::int AS completed_count
       FROM questions WHERE roadmap_id = $1 AND status = 'completed'`,
      [day.roadmap_id]
    );

    await client.query('COMMIT');

    res.json({
      day: updatedRes.rows[0],
      next_day: nextRes.rows[0] ?? null,
      completed_count: countRes.rows[0].completed_count,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[roadmap] POST complete error:', err);
    res.status(500).json({ error: 'Failed to mark day as complete' });
  } finally {
    client.release();
  }
});

export default router;
