/**
 * Regression check for the stale-roadmap bug.
 *
 * Scenario: analysis A -> generate -> analysis B (different JD) -> generate,
 * asserting the second roadmap targets B's gaps and never A's.
 *
 * The repo has no test runner, so this drives the real HTTP endpoints against
 * the dev DB with a throwaway user, then cleans up.
 *
 * The python-api /parse step is stubbed: analyses are written straight to
 * user_documents with the same upsert upload.ts uses. That's deliberate —
 * parsing a PDF costs a 1-2 min, 10+ LLM-call pipeline per analysis, and the
 * bug under test lives in what roadmap generation *reads*, not in parsing.
 * Roadmap generation itself is NOT stubbed and hits Gemini for real.
 *
 * Usage: npm run scenario:roadmap   (backend must be running)
 */
import jwt from 'jsonwebtoken';
import pool from '../src/db/pool';
import { loadCurrentAnalysis } from '../src/services/roadmapGeneration';

const BASE = `http://localhost:${process.env.PORT || 3000}`;

// ── Two analyses with deliberately disjoint requirements, so a roadmap built
// from the wrong one is unmistakable. ────────────────────────────────────────

const ANALYSIS_A = {
  jd: { role_title: 'Backend Engineer' },
  skills: {
    requirement_matches: [
      { requirement: 'Kubernetes and container orchestration', importance: 'must_have', strength: 'none', reasoning: 'No k8s anywhere in the resume.' },
      { requirement: 'AWS cloud infrastructure', importance: 'must_have', strength: 'weak', reasoning: 'Mentions AWS once, no depth.' },
      { requirement: 'Python proficiency', importance: 'must_have', strength: 'strong', reasoning: 'Four years of Python.' },
    ],
    gaps: [
      { requirement: 'Kubernetes and container orchestration', severity: 'hard_blocker', explanation: 'Core to the role; no evidence at all.' },
      { requirement: 'AWS cloud infrastructure', severity: 'learnable', explanation: 'Adjacent cloud experience exists.' },
    ],
  },
};

const ANALYSIS_B = {
  jd: { role_title: 'Frontend Engineer' },
  skills: {
    requirement_matches: [
      { requirement: 'React and component architecture', importance: 'must_have', strength: 'none', reasoning: 'No React on the resume.' },
      { requirement: 'Web accessibility (WCAG)', importance: 'must_have', strength: 'weak', reasoning: 'No a11y work evidenced.' },
      { requirement: 'CSS and responsive layout', importance: 'nice_to_have', strength: 'partial', reasoning: 'Some styling work.' },
      { requirement: 'JavaScript fundamentals', importance: 'must_have', strength: 'strong', reasoning: 'Strong JS background.' },
    ],
    gaps: [
      { requirement: 'React and component architecture', severity: 'hard_blocker', explanation: 'The role is React-first.' },
      { requirement: 'Web accessibility (WCAG)', severity: 'learnable', explanation: 'Teachable on the job.' },
      { requirement: 'CSS and responsive layout', severity: 'partially_covered', explanation: 'Some adjacent evidence.' },
    ],
  },
};

const A_TERMS = ['kubernetes', 'k8s', 'aws', 'container', 'orchestration', 'cloud infrastructure'];
const B_TERMS = ['react', 'accessibility', 'wcag', 'css', 'javascript', 'component', 'responsive'];

let failures = 0;
let skipped = 0;
function check(label: string, ok: boolean, detail = '') {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}
function skip(label: string, why: string) {
  console.log(`  SKIP  ${label} — ${why}`);
  skipped++;
}

/** Gemini's free tier is 20 requests/day/model; generation legitimately 502s once spent. */
function isQuotaExhausted(body: any) {
  return typeof body?.error === 'string' && body.error.includes("Couldn't generate your roadmap");
}

/** Stands in for a completed python-api analysis: same upsert upload.ts does. */
async function seedAnalysis(userId: string, report: unknown, label: string) {
  const { rows } = await pool.query(
    `INSERT INTO user_documents (user_id, parsed_resume, parsed_jd, analysis_report)
     VALUES ($1, '{}'::jsonb, $2, $3)
     ON CONFLICT (user_id) DO UPDATE
       SET parsed_jd = EXCLUDED.parsed_jd,
           analysis_report = EXCLUDED.analysis_report,
           uploaded_at = NOW()
     RETURNING uploaded_at::text AS uploaded_at`,
    [userId, JSON.stringify((report as any).jd), JSON.stringify(report)]
  );
  console.log(`\n[seed] analysis ${label} @ ${rows[0].uploaded_at}`);
  return rows[0].uploaded_at as string;
}

async function api(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) as any };
}

function focusSkills(days: any[]) {
  return days.map((d) => `${d.topic} | ${d.focus_skill}`);
}

function countMatching(days: any[], terms: string[]) {
  return days.filter((d) => {
    const hay = `${d.topic} ${d.focus_skill}`.toLowerCase();
    return terms.some((t) => hay.includes(t));
  }).length;
}

async function main() {
  const email = `scenario+${Date.now()}@preppilot.test`;
  const userRes = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`,
    [email]
  );
  const userId = userRes.rows[0].id as string;
  const token = jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  console.log(`test user ${userId}`);

  try {
    // ── Safeguard: no analysis at all must be a clear error, not a generic plan.
    console.log('\n=== 0. Generate with no analysis on file ===');
    const noAnalysis = await api('/api/roadmap/generate', token, {
      method: 'POST',
      body: JSON.stringify({ days: 5 }),
    });
    check('errors instead of silently generating', noAnalysis.status === 409,
      `status ${noAnalysis.status}: ${noAnalysis.body.error ?? ''}`);

    // ── Analysis A ───────────────────────────────────────────────────────────
    console.log('\n=== 1. Analysis A (Backend/Kubernetes) ===');
    const atA = await seedAnalysis(userId, ANALYSIS_A, 'A');

    // The exact context generation is handed. This is where the bug lived, so
    // it's asserted directly rather than inferred from the LLM's topics.
    const ctxA = await loadCurrentAnalysis(userId);
    check('generator input = A', ctxA.context.roleTitle === 'Backend Engineer',
      `roleTitle=${ctxA.context.roleTitle}`);
    check('generator input stamped with A\'s timestamp (microsecond-exact)',
      ctxA.uploadedAt === atA, `${ctxA.uploadedAt} vs ${atA}`);

    const genA = await api('/api/roadmap/generate', token, {
      method: 'POST', body: JSON.stringify({ days: 5 }),
    });
    const llmAvailable = genA.status === 201;

    if (llmAvailable) {
      console.log(focusSkills(genA.body.days).map((s) => `    ${s}`).join('\n'));
      check('roadmap A targets A\'s gaps', countMatching(genA.body.days, A_TERMS) > 0,
        `${countMatching(genA.body.days, A_TERMS)}/${genA.body.days.length} days match A`);
      const getA = await api('/api/roadmap', token);
      check('roadmap A reads as fresh', getA.body.is_stale === false, `is_stale=${getA.body.is_stale}`);
    } else if (isQuotaExhausted(genA.body)) {
      skip('LLM-generated topics for A', 'Gemini free-tier quota (20/day/model) exhausted');
    } else {
      throw new Error(`generate A failed unexpectedly: ${genA.status} ${JSON.stringify(genA.body)}`);
    }

    // Stand in for a roadmap that WAS generated from A, so staleness detection
    // can be exercised even when the LLM is unavailable.
    if (!llmAvailable) {
      await pool.query(
        `INSERT INTO roadmaps (user_id, topics, interview_date, analysis_uploaded_at)
         VALUES ($1, '[]'::jsonb, CURRENT_DATE, $2::timestamptz)
         ON CONFLICT (user_id) DO UPDATE SET analysis_uploaded_at = EXCLUDED.analysis_uploaded_at`,
        [userId, atA]
      );
      const seededFresh = await api('/api/roadmap', token);
      check('roadmap built from A reads as fresh', seededFresh.body.is_stale === false,
        `is_stale=${seededFresh.body.is_stale}`);
    }

    // ── Analysis B lands, WITHOUT regenerating ───────────────────────────────
    console.log('\n=== 2. Analysis B (Frontend/React) lands, no regeneration yet ===');
    const atB = await seedAnalysis(userId, ANALYSIS_B, 'B');

    const ctxB = await loadCurrentAnalysis(userId);
    check('generator input switched to B', ctxB.context.roleTitle === 'Frontend Engineer',
      `roleTitle=${ctxB.context.roleTitle}`);
    check('generator input stamped with B\'s timestamp (microsecond-exact)',
      ctxB.uploadedAt === atB, `${ctxB.uploadedAt} vs ${atB}`);

    const bReqs = (ctxB.context.gaps ?? []).map((g) => g.requirement.toLowerCase()).join(' ');
    check('generator input carries NO requirement from A',
      !A_TERMS.some((t) => bReqs.includes(t)), bReqs || '(no gaps)');

    // The bug: this roadmap belongs to A but was indistinguishable from current.
    const staleGet = await api('/api/roadmap', token);
    check('previous roadmap is now flagged stale (was silent before)',
      staleGet.body.is_stale === true, `is_stale=${staleGet.body.is_stale}`);

    // ── Regenerate against B ─────────────────────────────────────────────────
    console.log('\n=== 3. Generate again -> must reflect B, not A ===');
    const genB = await api('/api/roadmap/generate', token, {
      method: 'POST', body: JSON.stringify({ days: 5 }),
    });

    if (genB.status === 201) {
      console.log(focusSkills(genB.body.days).map((s) => `    ${s}`).join('\n'));
      const bHits = countMatching(genB.body.days, B_TERMS);
      const aLeaks = countMatching(genB.body.days, A_TERMS);
      check('roadmap B targets B\'s gaps', bHits > 0, `${bHits}/${genB.body.days.length} days match B`);
      check('roadmap B contains NO topics from analysis A', aLeaks === 0, `${aLeaks} leaked A topics`);
      const getB = await api('/api/roadmap', token);
      check('regenerated roadmap reads as fresh', getB.body.is_stale === false,
        `is_stale=${getB.body.is_stale}`);
    } else if (isQuotaExhausted(genB.body)) {
      skip('LLM-generated topics for B', 'Gemini free-tier quota (20/day/model) exhausted');
      // The failure must NOT leave A's roadmap passing as current.
      const afterFail = await api('/api/roadmap', token);
      check('failed regeneration leaves the old roadmap flagged stale, not silently current',
        afterFail.body.is_stale === true, `is_stale=${afterFail.body.is_stale}`);
    } else {
      throw new Error(`generate B failed unexpectedly: ${genB.status} ${JSON.stringify(genB.body)}`);
    }
  } finally {
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    console.log('\ntest user cleaned up');
    await pool.end();
  }

  const summary = `${failures === 0 ? 'All checks passed' : `${failures} check(s) FAILED`}${skipped ? `, ${skipped} skipped` : ''}.`;
  console.log(`\n${summary}`);
  if (skipped) console.log('Re-run once Gemini quota resets to cover the LLM-generated topics end-to-end.');
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
