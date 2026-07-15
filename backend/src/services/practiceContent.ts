import { randomUUID } from 'crypto';
import { callGemini } from './ai/callClaude';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PracticeResource {
  title: string;
  url: string;
}

export interface PracticeQuestion {
  id: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PracticeContent {
  resources: PracticeResource[];
  questions: PracticeQuestion[];
}

// Shape the LLM is asked to return (no ids yet — we assign those ourselves).
interface RawPracticeContent {
  resources?: { title?: string; url?: string }[];
  questions?: { text?: string; difficulty?: string }[];
}

const SYSTEM_PROMPT = `You are an interview-prep content curator. Given a study topic,
you produce a small, high-quality set of learning resources and practice interview questions.

Rules:
- Return 2-4 learning resources. Each must be a well-known, real, publicly reachable
  page (official docs, MDN, freeCodeCamp, LeetCode topic pages, GeeksforGeeks, well-known
  blogs, etc). Do NOT invent URLs to pages that are unlikely to exist. Prefer canonical
  landing/topic pages over deep links.
- Return 3-5 practice questions an interviewer would actually ask on this topic.
- "difficulty" must be exactly one of: "easy", "medium", "hard".
- Respond with ONLY a JSON object, no prose, matching:
  {
    "resources": [{ "title": string, "url": string }],
    "questions": [{ "text": string, "difficulty": "easy" | "medium" | "hard" }]
  }`;

const VALID_DIFFICULTY = new Set(['easy', 'medium', 'hard']);

/**
 * Generate curated learning resources + practice questions for a roadmap day.
 *
 * Uses the same Gemini wrapper the AI agents use. If the model call fails or
 * returns something unusable, we fall back to sensible generic content so the
 * Practice modal always has something to show (never blocks the user).
 */
export async function generatePracticeContent(
  topic: string,
  category?: string | null,
  learningGoal?: string | null,
): Promise<PracticeContent> {
  const userMessage = [
    `Topic: ${topic}`,
    category ? `Category / focus skill: ${category}` : null,
    learningGoal ? `Learning goal for the day: ${learningGoal}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const raw = await callGemini<RawPracticeContent>(SYSTEM_PROMPT, userMessage);
    return normalize(raw, topic);
  } catch (err) {
    console.error('[practiceContent] generation failed, using fallback:', err);
    return fallbackContent(topic);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(raw: RawPracticeContent, topic: string): PracticeContent {
  const resources: PracticeResource[] = (raw.resources ?? [])
    .filter((r) => r && typeof r.url === 'string' && /^https?:\/\//i.test(r.url.trim()))
    .slice(0, 4)
    .map((r) => ({
      title: (r.title || r.url || 'Resource').trim(),
      url: (r.url as string).trim(),
    }));

  const questions: PracticeQuestion[] = (raw.questions ?? [])
    .filter((q) => q && typeof q.text === 'string' && q.text.trim().length > 0)
    .slice(0, 5)
    .map((q) => {
      const difficulty = (q.difficulty || '').toLowerCase();
      return {
        id: randomUUID(),
        text: (q.text as string).trim(),
        difficulty: (VALID_DIFFICULTY.has(difficulty) ? difficulty : 'medium') as
          | 'easy'
          | 'medium'
          | 'hard',
      };
    });

  // If the model gave nothing usable in either bucket, fall back for that bucket.
  const fallback = fallbackContent(topic);
  return {
    resources: resources.length > 0 ? resources : fallback.resources,
    questions: questions.length > 0 ? questions : fallback.questions,
  };
}

function fallbackContent(topic: string): PracticeContent {
  const q = encodeURIComponent(topic);
  return {
    resources: [
      { title: `Search Google for "${topic}"`, url: `https://www.google.com/search?q=${q}` },
      { title: `${topic} on GeeksforGeeks`, url: `https://www.geeksforgeeks.org/?s=${q}` },
      { title: `${topic} questions on LeetCode`, url: `https://leetcode.com/problemset/?search=${q}` },
    ],
    questions: [
      {
        id: randomUUID(),
        text: `Explain the core concepts of ${topic} and where you'd apply them.`,
        difficulty: 'easy',
      },
      {
        id: randomUUID(),
        text: `Walk through a real problem you would solve using ${topic}.`,
        difficulty: 'medium',
      },
      {
        id: randomUUID(),
        text: `What are common pitfalls or trade-offs to watch for with ${topic}?`,
        difficulty: 'hard',
      },
    ],
  };
}
