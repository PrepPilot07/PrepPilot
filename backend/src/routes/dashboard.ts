import { Router, Response } from 'express';
import pool from '../db/pool';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { scoreAnswer } from '../services/answerScoring';

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function getSunday(d: Date): Date {
  const mon = getMonday(d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// ── GET /api/dashboard ──────────────────────────────────────────────────────

router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    // ── Fetch user ──────────────────────────────────────────────────────────
    const userRes = await pool.query(
      'SELECT name, email FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const userName = userRes.rows[0].name || userRes.rows[0].email.split('@')[0];

    // ── Fetch analysis report (contains decision.overall_score / weighted_score) ──
    const docRes = await pool.query(
      `SELECT analysis_report FROM user_documents WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1`,
      [userId]
    );
    const analysisReport = docRes.rows[0]?.analysis_report as Record<string, unknown> | undefined;

    let baseScore = 0;
    let roleTitle: string | null = null;
    let topicConfidenceFromAnalysis: { topic: string; percent: number }[] = [];

    if (analysisReport) {
      const weightedScore = analysisReport.weighted_score as number | undefined;
      const decision = analysisReport.decision as { overall_score?: number } | undefined;
      baseScore = weightedScore ?? decision?.overall_score ?? 0;

      const jd = analysisReport.jd as { role_title?: string } | undefined;
      roleTitle = jd?.role_title || null;

      // Extract topic confidence from new evidence-based requirement_matches
      const skills = analysisReport.skills as {
        requirement_matches?: Array<{
          requirement: string;
          strength: 'strong' | 'partial' | 'weak' | 'none';
        }>;
        // legacy flat arrays (kept for fallback)
        matched?: string[];
        missing?: string[];
        partial?: string[];
      } | undefined;
      if (skills) {
        const matches = skills.requirement_matches ?? [];
        if (matches.length > 0) {
          topicConfidenceFromAnalysis = matches.slice(0, 6).map((m) => ({
            topic: m.requirement,
            percent:
              m.strength === 'strong' ? 90
              : m.strength === 'partial' ? 55
              : m.strength === 'weak'   ? 25
              : 10,
          }));
        } else {
          // Fallback for older analyses that still have flat arrays
          const matched = skills.matched || [];
          const missing = skills.missing || [];
          const partial = skills.partial || [];
          const allSkills = [
            ...matched.map((s) => ({ topic: s, percent: 90 })),
            ...partial.map((s) => ({ topic: s, percent: 50 })),
            ...missing.map((s) => ({ topic: s, percent: 15 })),
          ];
          topicConfidenceFromAnalysis = allSkills.slice(0, 6);
        }
      }
    }

    // ── Fetch roadmap ───────────────────────────────────────────────────────
    const roadmapRes = await pool.query(
      `SELECT id, interview_date FROM roadmaps WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const roadmap = roadmapRes.rows[0] as { id: string; interview_date: string | null } | undefined;

    let daysUntilInterview: number | null = null;
    if (roadmap?.interview_date) {
      const interviewDate = new Date(roadmap.interview_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      daysUntilInterview = Math.max(0, Math.ceil((interviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // ── Fetch all completed days for this user ──────────────────────────────
    let allResponses: { id: string; question_id: string; submitted_at: string }[] = [];
    if (roadmap) {
      const responsesRes = await pool.query(
        `SELECT id, id as question_id, completed_at as submitted_at 
         FROM questions 
         WHERE roadmap_id = $1 AND status = 'completed' AND completed_at IS NOT NULL 
         ORDER BY completed_at ASC`,
        [roadmap.id]
      );
      allResponses = responsesRes.rows as { id: string; question_id: string; submitted_at: string }[];
    }
    const totalAnswered = allResponses.length;

    // ── Readiness score: base + 2 per answered question, cap 100 ────────────
    const readinessScore = Math.min(100, baseScore + totalAnswered * 2);

    // ── Readiness delta: score now vs score using only responses older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const oldResponses = allResponses.filter(r => new Date(r.submitted_at) < sevenDaysAgo);
    const oldScore = Math.min(100, baseScore + oldResponses.length * 2);
    const readinessDeltaWeek = readinessScore - oldScore;

    // ── Sessions this week (distinct days with >= 1 response, Mon-Sun) ──────
    const now = new Date();
    const monday = getMonday(now);
    const sunday = getSunday(now);
    const thisWeekResponses = allResponses.filter(r => {
      const d = new Date(r.submitted_at);
      return d >= monday && d <= sunday;
    });
    const distinctDays = new Set(thisWeekResponses.map(r => new Date(r.submitted_at).toDateString()));
    const sessionsThisWeek = Math.min(5, distinctDays.size);

    // ── Today's question ────────────────────────────────────────────────────
    let todayQuestion: Record<string, unknown> | null = null;
    if (roadmap) {
      const questionsRes = await pool.query(
        `SELECT id, day_number, topic, question_text, learning_goal, difficulty, focus_skill, status
         FROM questions WHERE roadmap_id = $1 ORDER BY day_number ASC`,
        [roadmap.id]
      );
      const questions = questionsRes.rows;

      const todayQ = questions.find(q => q.status === 'today');
      
      if (todayQ) {
        todayQuestion = {
          id: todayQ.id,
          day_number: todayQ.day_number,
          topic: todayQ.topic,
          question_text: todayQ.question_text,
          learning_goal: todayQ.learning_goal,
          difficulty: todayQ.difficulty,
          focus_skill: todayQ.focus_skill,
          already_answered: false,
        };
      } else if (questions.length > 0) {
        // Find the last completed
        const lastCompleted = questions.slice().reverse().find(q => q.status === 'completed');
        if (lastCompleted) {
          todayQuestion = {
            id: lastCompleted.id,
            day_number: lastCompleted.day_number,
            topic: lastCompleted.topic,
            question_text: lastCompleted.question_text,
            learning_goal: lastCompleted.learning_goal,
            difficulty: lastCompleted.difficulty,
            focus_skill: lastCompleted.focus_skill,
            already_answered: true,
          };
        } else {
           // fallback
           const first = questions[0];
           todayQuestion = {
             id: first.id,
             day_number: first.day_number,
             topic: first.topic,
             question_text: first.question_text,
             learning_goal: first.learning_goal,
             difficulty: first.difficulty,
             focus_skill: first.focus_skill,
             already_answered: false,
           };
        }
      }
    }

    // ── WhatsApp connected (read from users.whatsapp_number) ────────────────
    const wpRes = await pool.query(
      'SELECT whatsapp_number FROM users WHERE id = $1',
      [userId]
    );
    const whatsappConnected = !!(wpRes.rows[0]?.whatsapp_number);

    // ── Readiness trend (last 7 calendar days) ──────────────────────────────
    const readinessTrend: { day: string; score: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(23, 59, 59, 999);
      const responsesUpToDay = allResponses.filter(r => new Date(r.submitted_at) <= d);
      const dayScore = Math.min(100, baseScore + responsesUpToDay.length * 2);
      readinessTrend.push({
        day: DAY_NAMES[d.getDay()],
        score: dayScore,
      });
    }

    // ── Topic confidence ────────────────────────────────────────────────────
    // Use analysis-based data, boost topics that have been practiced
    let topicConfidence = topicConfidenceFromAnalysis;
    if (roadmap && topicConfidence.length === 0) {
      // Fallback: derive from roadmap question topics
      const questionsRes2 = await pool.query(
        `SELECT DISTINCT topic, focus_skill FROM questions WHERE roadmap_id = $1 LIMIT 6`,
        [roadmap.id]
      );
      topicConfidence = questionsRes2.rows.map(r => ({
        topic: r.focus_skill || r.topic,
        percent: 20,
      }));
    }

    // ── Streak days (consecutive days with a response, ending today/yesterday) ──
    let streakDays = 0;
    if (allResponses.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get distinct response dates sorted descending
      const responseDates = [...new Set(allResponses.map(r => {
        const d = new Date(r.submitted_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }))].sort((a, b) => b - a);

      // Check if today or yesterday starts the streak
      const todayTime = today.getTime();
      const yesterdayTime = todayTime - 86400000;

      if (responseDates[0] === todayTime || responseDates[0] === yesterdayTime) {
        let expectedDate = responseDates[0];
        for (const dateTime of responseDates) {
          if (dateTime === expectedDate) {
            streakDays++;
            expectedDate -= 86400000;
          } else if (dateTime < expectedDate) {
            break;
          }
        }
      }
    }

    // ── Weekly review summary ───────────────────────────────────────────────
    let weeklyReviewSummary: string;
    if (sessionsThisWeek === 0) {
      weeklyReviewSummary = "You haven't practiced this week yet. Start today to build momentum toward your interview.";
    } else {
      const pointsThisWeek = readinessDeltaWeek;
      weeklyReviewSummary = `You practiced ${sessionsThisWeek} time${sessionsThisWeek > 1 ? 's' : ''} this week and gained ${pointsThisWeek} readiness point${pointsThisWeek !== 1 ? 's' : ''}. Keep up the consistency to stay sharp.`;
    }

    // ── Response ────────────────────────────────────────────────────────────
    res.json({
      name: userName,
      role_title: roleTitle,
      readiness_score: readinessScore,
      readiness_delta_week: readinessDeltaWeek,
      sessions_this_week: sessionsThisWeek,
      sessions_goal: 5,
      days_until_interview: daysUntilInterview,
      today_question: todayQuestion,
      whatsapp_connected: whatsappConnected,
      readiness_trend: readinessTrend,
      topic_confidence: topicConfidence,
      streak_days: streakDays,
      weekly_review_summary: weeklyReviewSummary,
    });
  } catch (err) {
    console.error('[dashboard] GET error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// ── POST /api/dashboard/practice-answer ─────────────────────────────────────

router.post('/practice-answer', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { question_id, answer_text } = req.body;

  if (!question_id || !answer_text?.trim()) {
    res.status(400).json({ error: 'question_id and answer_text are required' });
    return;
  }

  try {
    // Verify question belongs to user's roadmap
    const questionRes = await pool.query(
      `SELECT q.id, q.roadmap_id, q.day_number, q.topic, q.question_text, q.learning_goal, q.difficulty, q.focus_skill
       FROM questions q
       JOIN roadmaps r ON r.id = q.roadmap_id
       WHERE q.id = $1 AND r.user_id = $2`,
      [question_id, userId]
    );

    if (questionRes.rows.length === 0) {
      res.status(404).json({ error: 'Question not found or does not belong to your roadmap' });
      return;
    }

    const question = questionRes.rows[0];

    // Insert response (legacy compatibility)
    await pool.query(
      `INSERT INTO responses (user_id, question_id, roadmap_id, answer_text)
       VALUES ($1, $2, $3, $4)`,
      [userId, question_id, question.roadmap_id, answer_text.trim()]
    );

    // Update questions status
    await pool.query(
      `UPDATE questions
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND status != 'completed'`,
      [question_id]
    );

    // Unlock next day
    await pool.query(
      `UPDATE questions
       SET status = 'today'
       WHERE id = (
         SELECT id FROM questions
         WHERE roadmap_id = $1 AND day_number > $2 AND status = 'locked'
         ORDER BY day_number ASC
         LIMIT 1
       )`,
      [question.roadmap_id, question.day_number]
    );

    // Compute updated stats using questions table
    const responsesRes = await pool.query(
      `SELECT completed_at as submitted_at FROM questions WHERE roadmap_id = $1 AND status = 'completed' AND completed_at IS NOT NULL`,
      [question.roadmap_id]
    );
    const totalAnswered = responsesRes.rows.length;

    // Get base score
    const docRes = await pool.query(
      `SELECT analysis_report FROM user_documents WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1`,
      [userId]
    );
    const analysisReport = docRes.rows[0]?.analysis_report as Record<string, unknown> | undefined;
    let baseScore = 0;
    if (analysisReport) {
      baseScore = (analysisReport.weighted_score as number) ?? (analysisReport.decision as { overall_score?: number })?.overall_score ?? 0;
    }

    const readinessScore = Math.min(100, baseScore + totalAnswered * 2);

    // Sessions this week
    const now = new Date();
    const day = now.getDay();
    const mondayDiff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(mondayDiff);
    monday.setHours(0, 0, 0, 0);
    const weekResponses = responsesRes.rows.filter(r => new Date(r.submitted_at) >= monday);
    const distinctDays = new Set(weekResponses.map(r => new Date(r.submitted_at).toDateString()));
    const sessionsThisWeek = Math.min(5, distinctDays.size);

    // Find todayQuestion
    const allQuestions = await pool.query(
      `SELECT id, day_number, topic, question_text, learning_goal, difficulty, focus_skill, status
       FROM questions WHERE roadmap_id = $1 ORDER BY day_number ASC`,
      [question.roadmap_id]
    );

    let todayQuestion: Record<string, unknown> | null = null;
    const todayQ = allQuestions.rows.find(q => q.status === 'today');
    if (todayQ) {
      todayQuestion = {
        id: todayQ.id,
        day_number: todayQ.day_number,
        topic: todayQ.topic,
        question_text: todayQ.question_text,
        learning_goal: todayQ.learning_goal,
        difficulty: todayQ.difficulty,
        focus_skill: todayQ.focus_skill,
        already_answered: false,
      };
    } else if (allQuestions.rows.length > 0) {
      const lastCompleted = allQuestions.rows.slice().reverse().find(q => q.status === 'completed');
      if (lastCompleted) {
        todayQuestion = {
          id: lastCompleted.id,
          day_number: lastCompleted.day_number,
          topic: lastCompleted.topic,
          question_text: lastCompleted.question_text,
          learning_goal: lastCompleted.learning_goal,
          difficulty: lastCompleted.difficulty,
          focus_skill: lastCompleted.focus_skill,
          already_answered: true,
        };
      }
    }

    // ── Generate AI score and feedback ──────────────────────────────────────
    const { score, feedback } = await scoreAnswer({
      questionText: question.question_text,
      difficulty: question.difficulty,
      answerText: answer_text.trim(),
    });

    res.json({
      success: true,
      readiness_score: readinessScore,
      sessions_this_week: sessionsThisWeek,
      today_question: todayQuestion,
      feedback,
      ai_score: score,
    });
  } catch (err) {
    console.error('[dashboard] POST practice-answer error:', err);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

export default router;
