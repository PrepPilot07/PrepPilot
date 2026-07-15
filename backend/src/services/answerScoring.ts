import { callGemini } from './ai/callGemini';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreAnswerInput {
  questionText: string;
  difficulty?: string | null; // 'easy' | 'medium' | 'hard'
  answerText: string;
}

export interface AnswerScore {
  score: number; // 0-10
  feedback: string;
}

interface RawScore {
  score?: unknown;
  feedback?: unknown;
}

const SYSTEM_PROMPT = `You are a technical interview coach grading a candidate's answer to a
single practice question.

Grade strictly but fairly on:
- Correctness of the core idea / approach.
- Whether time and space complexity were addressed when the question asks for them
  (if the question mentions complexity and the answer omits it, that lowers the score).
- Clarity and completeness relative to the question's difficulty.

Respond with ONLY a JSON object, no prose, no markdown fences, matching exactly:
{
  "score": <integer 0-10>,
  "feedback": "<1-3 sentences: what was good, what was missing or wrong>"
}`;

/**
 * Shared scoring function used by the web answer-submit endpoint (and, later,
 * the WhatsApp answer path). Pure: it calls the LLM and returns a validated
 * { score, feedback }. It does NOT touch the database — callers persist the
 * result themselves so scoring logic lives in exactly one place.
 *
 * Forces JSON-only output and validates/clamps it, with a safe fallback if the
 * model returns something unparseable.
 */
export async function scoreAnswer(input: ScoreAnswerInput): Promise<AnswerScore> {
  const userMessage = [
    `Question: ${input.questionText}`,
    input.difficulty ? `Difficulty: ${input.difficulty}` : null,
    `Candidate's answer:\n${input.answerText}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const raw = await callGemini<RawScore>(SYSTEM_PROMPT, userMessage);
    return normalize(raw);
  } catch (err) {
    console.error('[answerScoring] scoring failed, using fallback:', err);
    return {
      score: 0,
      feedback:
        'We could not automatically score this answer right now. Please try submitting again in a moment.',
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(raw: RawScore): AnswerScore {
  // Coerce + clamp score to an integer within [0, 10].
  let score = Number(raw.score);
  if (!Number.isFinite(score)) score = 0;
  score = Math.round(score);
  score = Math.max(0, Math.min(10, score));

  const feedback =
    typeof raw.feedback === 'string' && raw.feedback.trim().length > 0
      ? raw.feedback.trim()
      : 'No feedback was provided for this answer.';

  return { score, feedback };
}
