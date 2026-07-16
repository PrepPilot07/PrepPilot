import pool from '../db/pool';
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

// ── Skill-gap context (from the MS2 evidence-based fit analysis) ─────────────
// When present, the roadmap targets these specific gaps/strengths instead of
// falling back to the generic DSA syllabus below.

export interface RoadmapGapItem {
  requirement: string;
  importance: 'must_have' | 'nice_to_have';
  severity?: 'hard_blocker' | 'learnable' | 'partially_covered';
  reasoning?: string;
}

export interface RoadmapGenerationContext {
  roleTitle?: string;
  matchedSkills?: string[];
  gaps?: RoadmapGapItem[];
}

// Shape of the `skills` object inside a stored/returned analysis report —
// mirrors python-api's FitReport (src/utils/schemas.py).
interface AnalysisReportSkills {
  requirement_matches?: Array<{
    requirement: string;
    importance: 'must_have' | 'nice_to_have';
    strength: 'strong' | 'partial' | 'weak' | 'none';
    reasoning?: string;
  }>;
  gaps?: Array<{
    requirement: string;
    severity: 'hard_blocker' | 'learnable' | 'partially_covered';
    explanation: string;
  }>;
}

interface AnalysisReport {
  skills?: AnalysisReportSkills;
  jd?: { role_title?: string };
}

/**
 * Thrown when a roadmap can't be tied to a usable current analysis. Callers
 * surface this to the user instead of silently generating a generic plan.
 */
export class NoAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoAnalysisError';
  }
}

/**
 * Derive a RoadmapGenerationContext from a stored/returned analysis report
 * (the JSON produced by the python-api /parse pipeline). Returns undefined if
 * the report has no evidence-based requirement matches to build gaps from —
 * the caller should fall back to the generic DSA roadmap in that case.
 */
export function buildRoadmapContext(report: unknown): RoadmapGenerationContext | undefined {
  const { skills, jd } = (report ?? {}) as AnalysisReport;
  const matches = skills?.requirement_matches;
  if (!matches?.length) return undefined;

  const gapByRequirement = new Map((skills?.gaps ?? []).map((g) => [g.requirement, g]));

  const gaps: RoadmapGapItem[] = matches
    .filter((m) => m.strength !== 'strong')
    .map((m) => {
      const gapInfo = gapByRequirement.get(m.requirement);
      return {
        requirement: m.requirement,
        importance: m.importance,
        severity: gapInfo?.severity,
        reasoning: gapInfo?.explanation ?? m.reasoning,
      };
    });

  const matchedSkills = matches.filter((m) => m.strength === 'strong').map((m) => m.requirement);

  return { roleTitle: jd?.role_title, matchedSkills, gaps };
}

/**
 * The analysis a roadmap should be built from: the user's current
 * user_documents row (one per user, overwritten on each upload).
 *
 * `uploadedAt` is stamped onto the roadmap so a plan can be proven to belong to
 * a given analysis — without it, a roadmap left behind by a failed regeneration
 * is indistinguishable from a current one.
 *
 * It is carried as the raw Postgres text, NOT a JS Date: timestamptz keeps
 * microseconds and Date truncates to milliseconds, so round-tripping through
 * Date makes the stamp differ from its source and flags every roadmap stale
 * forever. Callers must re-cast it with `$n::timestamptz`.
 *
 * Throws NoAnalysisError rather than returning undefined: every caller wants a
 * clear error, not a silent fall back to the generic syllabus.
 */
export async function loadCurrentAnalysis(
  userId: string
): Promise<{ uploadedAt: string; context: RoadmapGenerationContext }> {
  const { rows } = await pool.query(
    `SELECT analysis_report, uploaded_at::text AS uploaded_at
     FROM user_documents WHERE user_id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    throw new NoAnalysisError('No analysis found. Upload your resume and job description first.');
  }

  const context = buildRoadmapContext(rows[0].analysis_report);
  if (!context) {
    throw new NoAnalysisError(
      'Your latest analysis has no skill-gap results to build a roadmap from. Please re-run the analysis.'
    );
  }

  return { uploadedAt: rows[0].uploaded_at as string, context };
}

export const MIN_DAYS = 1;
export const MAX_DAYS = 60;

const VALID_DIFFICULTY = new Set<Difficulty>(['easy', 'medium', 'hard']);

const GENERIC_SYSTEM_PROMPT = `You are an expert technical-interview coach who builds day-by-day preparation
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

const GAP_AWARE_SYSTEM_PROMPT = `You are an expert technical-interview coach who builds day-by-day
preparation roadmaps targeting a SPECIFIC candidate's SPECIFIC skill gaps for a SPECIFIC role —
not a generic algorithms syllabus.

You are given: the number of days N until the interview, the role title, a list of must-have gaps
(requirements the JD needs that the candidate's resume doesn't evidence, each with a severity —
hard_blocker is the most urgent, learnable means a competent engineer could pick it up on the job,
partially_covered means adjacent experience exists), a list of nice-to-have gaps, and the
candidate's existing strengths (requirements the resume already strongly evidences).

## Distribution rules
- Spend roughly the first 60% of days directly on the MUST-HAVE gaps, in the order given —
  hard_blocker gaps before learnable/partially_covered ones, since blockers are foundational.
- Spend roughly the next 20-25% on NICE-TO-HAVE gaps and deepening partially-covered areas.
- Reserve the final 15-20% for: reinforcing the candidate's EXISTING STRENGTHS with harder/edge-case
  questions (assume competence — push further, don't reteach from scratch), one behavioral/STAR
  day, and a final capstone day combining the role's top 2-3 gaps in one realistic scenario.
- If there are fewer gaps than days, don't pad with generic filler — go deeper on each gap (edge
  cases, trade-offs, failure modes, real-world scale) or add more strength-reinforcement / mock
  days.
- If there are more gaps than days, cover the highest-importance/most-severe gaps first and drop
  the rest — never leave a day vague or generic.
- Never leave a day empty; every day gets one concrete, specific topic tied to a named gap or
  strength from the input — never invent unrelated topics (e.g. don't add generic DSA days unless
  a gap explicitly calls for algorithmic/coding-interview prep).

## Difficulty ramp
- Early days: "easy" (fundamentals, definitions, simple comparisons for the gap topic)
- Middle days: "medium" (applied scenarios, trade-off analysis, debugging walks)
- Late days: "hard" (system design at scale, architecture decisions, STAR behavioural deep-dives)

## Output
Return ONLY a JSON object (no prose, no markdown fences) matching EXACTLY:
{
  "days": [
    {
      "day_number": <int, consecutive 1..N>,
      "topic": "<3-6 word title specific to the gap, e.g. 'Kubernetes Pod Scheduling Basics'>",
      "focus_skill": "<the specific gap or strength requirement this day targets>",
      "learning_goal": "<ONE sentence: what they can do/explain after this day>",
      "difficulty": "easy" | "medium" | "hard",
      "question_text": "<ONE concrete, self-contained interview question on this
                        day's topic, answerable verbally in 5-15 minutes>"
    }
  ]
}

Rules:
- "days" MUST contain EXACTLY N items, day_number 1..N in order.
- Every topic must map to one of the specific gaps/strengths given.
- No duplicate topics unless it's an explicit revision/mock day (say so in the topic).
- question_text must be self-contained — no "yesterday" / "see above".`;

function formatGap(g: RoadmapGapItem): string {
  const tag = g.severity ? ` [${g.severity}]` : '';
  const why = g.reasoning ? `: ${g.reasoning}` : '';
  return `- ${g.requirement}${tag}${why}`;
}

function buildGapAwareMessage(days: number, context: RoadmapGenerationContext): string {
  const mustHave = (context.gaps ?? []).filter((g) => g.importance === 'must_have');
  const niceToHave = (context.gaps ?? []).filter((g) => g.importance === 'nice_to_have');
  const matched = context.matchedSkills ?? [];

  return `The candidate has N = ${days} days until their interview for the role: ${context.roleTitle ?? 'the target role'}.

MUST-HAVE GAPS (prioritize these first, in order — hard_blocker before learnable/partially_covered):
${mustHave.length ? mustHave.map(formatGap).join('\n') : '(none identified)'}

NICE-TO-HAVE GAPS:
${niceToHave.length ? niceToHave.map(formatGap).join('\n') : '(none identified)'}

CANDIDATE'S EXISTING STRENGTHS (already demonstrated — reinforce/deepen, don't reteach from scratch):
${matched.length ? matched.map((s) => `- ${s}`).join('\n') : '(none identified)'}

Generate a focused ${days}-day plan that closes these specific gaps for this specific role.`;
}

/**
 * Generate a fresh N-day interview-prep roadmap via the LLM (same Gemini client
 * the rest of the app uses). When a skill-gap context is supplied (from the MS2
 * evidence-based fit analysis), the plan targets those specific gaps/strengths;
 * otherwise it falls back to a generic DSA-fundamentals syllabus. Validates the
 * response; retries once with a stricter reminder; throws if it still doesn't
 * produce a valid N-day plan so the caller can surface a clear error rather
 * than persisting garbage.
 */
export async function generateRoadmap(
  days: number,
  context?: RoadmapGenerationContext
): Promise<GeneratedDay[]> {
  const hasContext = !!(context && (context.gaps?.length || context.matchedSkills?.length));
  const systemPrompt = hasContext ? GAP_AWARE_SYSTEM_PROMPT : GENERIC_SYSTEM_PROMPT;
  const baseMessage = hasContext
    ? buildGapAwareMessage(days, context!)
    : `The candidate has N = ${days} days until their interview. Generate the ${days}-day plan.`;
  const strictReminder = `\n\nSTRICT: output valid JSON only, with a "days" array of EXACTLY ${days} objects, each containing day_number, topic, focus_skill, learning_goal, difficulty (easy|medium|hard), and question_text.`;

  // Attempt 1, then a stricter attempt 2.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const userMessage = attempt === 1 ? baseMessage : baseMessage + strictReminder;
    try {
      const raw = await callGemini<RawRoadmap>(systemPrompt, userMessage);
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
