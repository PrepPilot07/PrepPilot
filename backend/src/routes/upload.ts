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

    // --- Input validation ---
    if (!file) {
      res.status(400).json({ error: 'Resume file is required' });
      return;
    }
    if (!jdText || !jdText.trim()) {
      res.status(400).json({ error: 'Job description text is required' });
      return;
    }

    // --- Forward to Python parse microservice ---
    const form = new FormData();
    form.append('resume_file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    form.append('jd_text', jdText);

    let parsed: { resume: Record<string, unknown>; jd: Record<string, unknown> };
    try {
      const response = await axios.post(`${PYTHON_API}/parse`, form, {
        headers: form.getHeaders(),
        timeout: 60_000, // 60 s — LLM can be slow
      });
      parsed = response.data;
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
          res.status(502).json({
            error: err.response.data?.detail || 'Parse service returned an error',
          });
          return;
        }
      }

      res.status(500).json({ error: 'Failed to parse documents — please try again.' });
      return;
    }

    // --- Persist to database ---
    try {
      await pool.query(
        `INSERT INTO user_documents (user_id, parsed_resume, parsed_jd)
         VALUES ($1, $2, $3)`,
        [userId, JSON.stringify(parsed.resume), JSON.stringify(parsed.jd)]
      );

      await pool.query(
        `UPDATE users SET has_uploaded_documents = TRUE WHERE id = $1`,
        [userId]
      );
    } catch (dbErr) {
      console.error('[upload] DB insert error:', dbErr);
      res.status(500).json({ error: 'Failed to save parsed documents to database.' });
      return;
    }

    res.status(200).json({
      success: true,
      resume: parsed.resume,
      jd: parsed.jd,
    });
  }
);

// ── GET /api/upload (fetch latest parsed docs for this user) ─────────────────

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const result = await pool.query(
      `SELECT parsed_resume, parsed_jd, uploaded_at
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
      uploadedAt: row.uploaded_at,
    });
  } catch (err) {
    console.error('[upload] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;
