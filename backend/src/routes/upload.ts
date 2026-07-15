
import { Router, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import pool from '../db/pool';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// ── Multer: memory storage, 10 MB limit, PDF/DOCX only ──────────────────────

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  },
});

const PYTHON_API = process.env.PARSE_API_URL || 'http://localhost:8001';

// ── POST /api/upload ─────────────────────────────────────────────────────────

router.post(
  '/',
  verifyToken,
  upload.single('resume'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const jdText = req.body?.jdText as string | undefined;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'Resume file is required' });
      return;
    }
    if (!jdText || !jdText.trim()) {
      res.status(400).json({ error: 'Job description text is required' });
      return;
    }

    // ── Forward to Python parse + analysis microservice ───────────────────────
    const form = new FormData();
    form.append('resume_file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    form.append('jd_text', jdText);

    let report: Record<string, unknown>;
    try {
      console.log('[upload] Calling Python analysis API...');
      const response = await axios.post(`${PYTHON_API}/parse`, form, {
        headers: form.getHeaders(),
        timeout: 360_000, // 6 min — 4-wave pipeline with 10+ LLM calls on free tier
      });
      report = response.data as Record<string, unknown>;
      const rec = (report.decision as Record<string, unknown>)?.recommendation;
      console.log('[upload] Pipeline complete. Recommendation:', rec);
    } catch (err: unknown) {
      console.error('[upload] Python parse API error:', err);
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNREFUSED') {
          res.status(503).json({
            error: 'Parse service is offline. Please start the Python API server on port 8001.',
          });
          return;
        }
        if (err.response) {
          const detail = (err.response.data as Record<string, string>)?.detail;
          const isQuota =
            detail?.includes('RESOURCE_EXHAUSTED') || detail?.includes('Quota exceeded');
          res.status(502).json({
            error: isQuota
              ? 'Gemini API daily quota reached. Please wait a few minutes and try again, or upgrade your API key plan.'
              : detail || 'Parse service returned an error',
          });
          return;
        }
      }
      res.status(500).json({ error: 'Failed to analyse documents. Please try again.' });
      return;
    }

    // ── Persist to database ────────────────────────────────────────────────────
    try {
      const resumeJson = JSON.stringify(report.resume);
      const jdJson = JSON.stringify(report.jd);
      const reportJson = JSON.stringify(report);

      await pool.query(
        `INSERT INTO user_documents (user_id, parsed_resume, parsed_jd, analysis_report)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [userId, resumeJson, jdJson, reportJson]
      );

      await pool.query(
        `UPDATE user_documents
         SET parsed_resume = $2, parsed_jd = $3, analysis_report = $4, uploaded_at = NOW()
         WHERE user_id = $1`,
        [userId, resumeJson, jdJson, reportJson]
      );

      await pool.query(
        `UPDATE users SET has_uploaded_documents = TRUE WHERE id = $1`,
        [userId]
      );
    } catch (dbErr) {
      console.error('[upload] DB insert error:', dbErr);
      res.status(500).json({ error: 'Failed to save documents to database.' });
      return;
    }

    // ── Persist roadmap + questions (Wave 4 output) ────────────────────────────
    const roadmapData = report.roadmap as {
      days?: Array<{
        day_number: number;
        topic: string;
        question_text: string;
        learning_goal?: string;
        difficulty?: string;
        focus_skill?: string;
      }>;
      summary?: string;
    } | undefined;

    if (roadmapData?.days && Array.isArray(roadmapData.days) && roadmapData.days.length > 0) {
      try {
        const interviewDate = new Date();
        interviewDate.setDate(interviewDate.getDate() + 15);
        const interviewDateStr = interviewDate.toISOString().split('T')[0];

        // Upsert roadmap row — one per user
        const roadmapRes = await pool.query(
          `INSERT INTO roadmaps (user_id, topics, interview_date)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id) DO UPDATE
             SET topics = EXCLUDED.topics,
                 interview_date = EXCLUDED.interview_date,
                 created_at = NOW()
           RETURNING id`,
          [userId, JSON.stringify(roadmapData.days), interviewDateStr]
        );
        const roadmapId = roadmapRes.rows[0].id as string;

        // Delete old questions for this roadmap, then bulk-insert new ones
        await pool.query(`DELETE FROM questions WHERE roadmap_id = $1`, [roadmapId]);

        // The earliest day starts as the active ('today') day; the rest are locked
        // until the user completes each one in turn.
        const minDayNumber = Math.min(...roadmapData.days.map((d) => d.day_number));

        for (const day of roadmapData.days) {
          await pool.query(
            `INSERT INTO questions (roadmap_id, day_number, topic, question_text, learning_goal, difficulty, focus_skill, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              roadmapId,
              day.day_number,
              day.topic,
              day.question_text,
              day.learning_goal ?? null,
              day.difficulty ?? null,
              day.focus_skill ?? null,
              day.day_number === minDayNumber ? 'today' : 'locked',
            ]
          );
        }

        console.log(`[upload] Roadmap upserted (${roadmapData.days.length} questions) for user ${userId}`);
      } catch (roadmapErr) {
        // Non-fatal: log and continue — analysis result is already saved
        console.error('[upload] Roadmap DB error (non-fatal):', roadmapErr);
      }
    }

    // ── Return full report to frontend ────────────────────────────────────────
    res.status(200).json({ success: true, ...report });
  }
);

// ── GET /api/upload ───────────────────────────────────────────────────────────

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const result = await pool.query(
      `SELECT parsed_resume, parsed_jd, analysis_report, uploaded_at
       FROM user_documents
       WHERE user_id = $1
       ORDER BY uploaded_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No documents uploaded yet' });
      return;
    }

    const row = result.rows[0];
    res.json({
      resume: row.parsed_resume,
      jd: row.parsed_jd,
      ...(row.analysis_report ?? {}),
      uploadedAt: row.uploaded_at,
    });
  } catch (err) {
    console.error('[upload] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;
