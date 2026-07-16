import { Router, Response } from 'express';
import pool from '../db/pool';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { generatePracticeContent } from '../services/practiceContent';
import { scoreAnswer } from '../services/answerScoring';
import { createNotification } from '../services/notifications';

import {
  generateRoadmap,
  loadCurrentAnalysis,
  NoAnalysisError,
  MIN_DAYS,
  MAX_DAYS,
} from '../services/roadmapGeneration';

const router = Router();

// ── GET /api/roadmap ──────────────────────────────────────────────────────────

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    // Fetch the user's roadmap metadata, plus whether it was built from the
    // analysis that's currently on file. They diverge when regeneration failed
    // after a new upload and the previous plan was left in place.
    const roadmapRes = await pool.query(
      `SELECT r.id, r.user_id, r.interview_date, r.created_at,
              (r.analysis_uploaded_at IS DISTINCT FROM ud.uploaded_at) AS is_stale
       FROM roadmaps r
       LEFT JOIN user_documents ud ON ud.user_id = r.user_id
       WHERE r.user_id = $1
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
      // True when this plan doesn't match the analysis currently on file, so the
      // UI can offer to regenerate instead of presenting it as up to date.
      is_stale: roadmap.is_stale,
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

// ── POST /api/roadmap/generate ────────────────────────────────────────────────
// Generate a fresh N-day roadmap via the LLM and persist it for the user,
// replacing any existing roadmap. Reuses the same storage shape as the upload
// pipeline so the frontend renders it with no changes.

router.post('/generate', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const daysRaw = req.body?.days;
  const days = Number(daysRaw);

  if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) {
    res.status(400).json({ error: `days must be an integer between ${MIN_DAYS} and ${MAX_DAYS}` });
    return;
  }

  // Build from the user's current analysis. A missing/unusable analysis is a
  // hard error — silently generating a generic syllabus is what made stale and
  // irrelevant roadmaps indistinguishable from correct ones.
  let analysis;
  try {
    analysis = await loadCurrentAnalysis(userId);
  } catch (err) {
    if (err instanceof NoAnalysisError) {
      res.status(409).json({ error: err.message });
      return;
    }
    console.error('[roadmap] failed to load analysis:', err);
    res.status(500).json({ error: 'Failed to load your analysis' });
    return;
  }

  // Generate first (outside the transaction — this is the slow, failure-prone part).
  let plan;
  try {
    plan = await generateRoadmap(days, analysis.context);
  } catch (err) {
    console.error('[roadmap] generate error:', err);
    res.status(502).json({ error: "Couldn't generate your roadmap. Please try again." });
    return;
  }

  const interviewDate = new Date();
  interviewDate.setDate(interviewDate.getDate() + days);
  const interviewDateStr = interviewDate.toISOString().split('T')[0];

  const minDayNumber = Math.min(...plan.map((d) => d.day_number));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // One roadmap per user — upsert and replace its questions.
    const roadmapRes = await client.query(
      `INSERT INTO roadmaps (user_id, topics, interview_date, analysis_uploaded_at)
       VALUES ($1, $2, $3, $4::timestamptz)
       ON CONFLICT (user_id) DO UPDATE
         SET topics = EXCLUDED.topics,
             interview_date = EXCLUDED.interview_date,
             analysis_uploaded_at = EXCLUDED.analysis_uploaded_at,
             created_at = NOW()
       RETURNING id, interview_date, created_at`,
      [userId, JSON.stringify(plan), interviewDateStr, analysis.uploadedAt]
    );
    const roadmap = roadmapRes.rows[0];
    const roadmapId = roadmap.id as string;

    await client.query(`DELETE FROM questions WHERE roadmap_id = $1`, [roadmapId]);

    const insertedDays = [];
    for (const day of plan) {
      const insertRes = await client.query(
        `INSERT INTO questions
           (roadmap_id, day_number, topic, question_text, learning_goal, difficulty, focus_skill, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, day_number, topic, question_text, learning_goal, difficulty, focus_skill,
                   status, completed_at, sent_at`,
        [
          roadmapId,
          day.day_number,
          day.topic,
          day.question_text,
          day.learning_goal,
          day.difficulty,
          day.focus_skill,
          day.day_number === minDayNumber ? 'today' : 'locked',
        ]
      );
      insertedDays.push(insertRes.rows[0]);
    }

    await client.query('COMMIT');

    // Respond in the same shape as GET /api/roadmap so the frontend can drop it
    // straight into state. Fresh days have no practice content generated yet.
    res.status(201).json({
      roadmap_id: roadmapId,
      interview_date: roadmap.interview_date,
      created_at: roadmap.created_at,
      // Just built from the current analysis by definition.
      is_stale: false,
      completed_count: 0,
      days: insertedDays.map((row) => ({
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
        has_practice_content: false,
      })),
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[roadmap] generate persist error:', err);
    res.status(500).json({ error: 'Failed to save the generated roadmap' });
  } finally {
    client.release();
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

    // Notify when completing this day actually unlocked the next one. Runs
    // post-commit and best-effort, so it never blocks the completion response.
    const unlocked = nextRes.rows[0];
    if (unlocked) {
      await createNotification(
        userId,
        'day_unlocked',
        `Day ${unlocked.day_number} unlocked: ${unlocked.topic}`,
        unlocked.id
      );
    }

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

// ── Helpers ───────────────────────────────────────────────────────────────────

interface PracticeQuestionRow {
  id: string;
  text: string;
  difficulty?: string | null;
}

// ── POST /api/roadmap/:dayId/questions/:questionId/answers ─────────────────────
// Submit an answer to a single practice question, score it via the shared
// scoreAnswer() service, persist it, and return the scored answer.

router.post(
  '/:dayId/questions/:questionId/answers',
  verifyToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { dayId, questionId } = req.params;
    const answerText = (req.body?.answer_text as string | undefined)?.trim();

    if (!answerText) {
      res.status(400).json({ error: 'answer_text is required' });
      return;
    }

    try {
      const dayRes = await pool.query(
        `SELECT q.id, q.topic, q.status, q.practice_questions
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

      // The practice question lives inside the day's practice_questions JSONB.
      const questions: PracticeQuestionRow[] = Array.isArray(day.practice_questions)
        ? day.practice_questions
        : [];
      const question = questions.find((q) => q.id === questionId);

      if (!question) {
        res.status(404).json({ error: 'Practice question not found for this day' });
        return;
      }

      // Shared scoring logic (same function the WhatsApp path will use later).
      const { score, feedback } = await scoreAnswer({
        questionText: question.text,
        difficulty: question.difficulty,
        answerText,
      });

      const insertRes = await pool.query(
        `INSERT INTO practice_answers
           (user_id, day_id, question_id, answer_text, source, ai_score, ai_feedback)
         VALUES ($1, $2, $3, $4, 'web', $5, $6)
         RETURNING id, day_id, question_id, answer_text, source, ai_score, ai_feedback, created_at`,
        [userId, dayId, questionId, answerText, score, feedback]
      );

      // Notify the user their answer was scored. Best-effort, post-insert, so a
      // notification failure never blocks the scored-answer response.
      const scoreLabel = score == null ? '' : ` ${score}/10`;
      await createNotification(
        userId,
        'answer_scored',
        `Answer scored${scoreLabel} · ${day.topic}`,
        String(dayId)
      );

      res.status(201).json(insertRes.rows[0]);
    } catch (err) {
      console.error('[roadmap] POST answer error:', err);
      res.status(500).json({ error: 'Failed to submit answer' });
    }
  }
);

// ── GET /api/roadmap/:dayId/answers ───────────────────────────────────────────
// Returns all of the user's submitted answers for a day (across every practice
// question), newest first, so the modal can prefill existing scores in one call.

router.get('/:dayId/answers', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { dayId } = req.params;

  try {
    const dayRes = await pool.query(
      `SELECT q.id
       FROM questions q
       JOIN roadmaps r ON r.id = q.roadmap_id
       WHERE q.id = $1 AND r.user_id = $2`,
      [dayId, userId]
    );

    if (dayRes.rows.length === 0) {
      res.status(404).json({ error: 'Day not found or does not belong to your roadmap' });
      return;
    }

    const answersRes = await pool.query(
      `SELECT id, day_id, question_id, answer_text, source, ai_score, ai_feedback, created_at
       FROM practice_answers
       WHERE user_id = $1 AND day_id = $2
       ORDER BY created_at DESC`,
      [userId, dayId]
    );

    res.json({ answers: answersRes.rows });
  } catch (err) {
    console.error('[roadmap] GET answers error:', err);
    res.status(500).json({ error: 'Failed to fetch answers' });
  }
});

export default router;
