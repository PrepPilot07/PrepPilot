import { callGemini } from './ai/callGemini';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GeneratedDay {
  day_number: number;
  topic: string;
  focus_skill: string;
  learning_goal: string;
  difficulty: Difficulty;
  question_text: string;
}

interface RawRoadmap {
  days?: unknown;
}

export const MIN_DAYS = 1;
export const MAX_DAYS = 60;

const VALID_DIFFICULTY = new Set<Difficulty>(['easy', 'medium', 'hard']);

const SYSTEM_PROMPT = `You are an expert technical-interview coach who builds day-by-day preparation
roadmaps for software-engineering / DSA interviews.

You are given N — the number of days until the candidate's interview. Produce a
focused plan of EXACTLY N days.

## Syllabus to draw from (choose & order to fit N)
- Complexity analysis (Big-O, time/space)
- Arrays & strings
- Hashing / hash maps & sets
- Two pointers & sliding window
- Stacks & queues
- Linked lists
- Recursion & backtracking
- Trees & binary search trees
- Heaps / priority queues
- Graphs (BFS/DFS, shortest paths)
- Sorting & searching (incl. binary search)
- Greedy algorithms
- Dynamic programming
- Bit manipulation
- System design basics (later days / larger N)
- Behavioral / STAR interview prep

## Distribution rules
- ALWAYS front-load core fundamentals first: complexity analysis, arrays &
  strings, hashing, two pointers.
- If N is small (<= 7): cover only the highest-leverage fundamentals above, one
  focused topic per day; do NOT squeeze in advanced topics (graphs, DP, system
  design).
- As N grows, add intermediate then advanced topics in dependency order
  (recursion before trees/DP; trees before graphs).
- For larger N (>= 12): interleave spaced-revision days, 1-2 mock-interview
  days, a behavioral-prep day, and a final review/buffer day before the
  interview.
- Never leave a day empty or vague; every day gets one concrete topic.

## Difficulty ramp
- Early days: "easy"   (fundamentals, definitions, simple problems)
- Middle days: "medium" (applied problems, trade-offs)
- Late days: "hard"    (advanced topics, optimization, system design, mocks)
Each day's difficulty must be exactly "easy", "medium", or "hard".

## Output
Return ONLY a JSON object (no prose, no markdown fences) matching EXACTLY:
{
  "days": [
    {
      "day_number": <int, consecutive 1..N>,
      "topic": "<3-6 word title, e.g. 'Arrays & String Manipulation'>",
      "focus_skill": "<single core skill/category, e.g. 'Dynamic Programming'>",
      "learning_goal": "<ONE sentence: what they can do/explain after this day>",
      "difficulty": "easy" | "medium" | "hard",
      "question_text": "<ONE concrete, self-contained interview question on this
                        day's topic, answerable verbally in 5-15 minutes>"
    }
  ]
}

Rules:
- "days" MUST contain EXACTLY N items, day_number 1..N in order.
- No duplicate topics unless it's an explicit revision/mock day (say so in the
  topic, e.g. 'Revision: Arrays & Hashing').
- question_text must be self-contained — no "yesterday" / "see above".`;

/**
 * Generate a fresh N-day interview-prep roadmap via the LLM (same Gemini client
 * the rest of the app uses). Validates the response; retries once with a
 * stricter reminder; throws if it still doesn't produce a valid N-day plan so
 * the caller can surface a clear error rather than persisting garbage.
 */
export async function generateRoadmap(days: number): Promise<GeneratedDay[]> {
  const baseMessage = `The candidate has N = ${days} days until their interview. Generate the ${days}-day plan.`;
  const strictReminder = `\n\nSTRICT: output valid JSON only, with a "days" array of EXACTLY ${days} objects, each containing day_number, topic, focus_skill, learning_goal, difficulty (easy|medium|hard), and question_text.`;

  // Attempt 1, then a stricter attempt 2.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const userMessage = attempt === 1 ? baseMessage : baseMessage + strictReminder;
    try {
      const raw = await callGemini<RawRoadmap>(SYSTEM_PROMPT, userMessage);
      const parsed = validate(raw, days);
      if (parsed) return parsed;
      console.warn(`[roadmapGeneration] validation failed on attempt ${attempt}`);
    } catch (err) {
      console.warn(`[roadmapGeneration] generation error on attempt ${attempt}:`, err);
    }
  }

  throw new Error(`Failed to generate a valid ${days}-day roadmap`);
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(raw: RawRoadmap, expectedDays: number): GeneratedDay[] | null {
  if (!raw || !Array.isArray(raw.days)) return null;
  if (raw.days.length !== expectedDays) return null;

  const out: GeneratedDay[] = [];

  for (let i = 0; i < raw.days.length; i++) {
    const d = raw.days[i] as Record<string, unknown>;
    if (!d || typeof d !== 'object') return null;

    const topic = str(d.topic);
    const learningGoal = str(d.learning_goal);
    const questionText = str(d.question_text);
    // topic + a usable question are the non-negotiable fields.
    if (!topic || !questionText) return null;

    const rawDifficulty = String(d.difficulty ?? '').toLowerCase();
    const difficulty: Difficulty = VALID_DIFFICULTY.has(rawDifficulty as Difficulty)
      ? (rawDifficulty as Difficulty)
      : 'medium';

    out.push({
      // Normalize to consecutive 1..N regardless of what the model numbered.
      day_number: i + 1,
      topic,
      focus_skill: str(d.focus_skill) || topic,
      learning_goal: learningGoal || `Build confidence in ${topic}.`,
      difficulty,
      question_text: questionText,
    });
  }

  return out;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}
