import { skillMatchAgent } from './agents/skillMatchAgent';
import { experienceAgent } from './agents/experienceAgent';
import { educationAgent } from './agents/educationAgent';
import { cultureAgent } from './agents/cultureAgent';
import { interviewAgent } from './agents/interviewAgent';
import { narrativeAgent } from './agents/narrativeAgent';
import { callGemini } from './callClaude';
import type {
  ParsedResume,
  ParsedJD,
  AnalysisReport,
  SkillMatchResult,
  ExperienceResult,
  EducationResult,
  CultureFitResult,
  InterviewQuestionsResult,
  NarrativeResult,
  HiringDecision,
} from './types';

// ── Scoring weights (must sum to 1.0) ─────────────────────────────────────────
const WEIGHTS = {
  skills:     parseFloat(process.env.WEIGHT_SKILL      || '0.40'),
  experience: parseFloat(process.env.WEIGHT_EXPERIENCE || '0.30'),
  culture:    parseFloat(process.env.WEIGHT_CULTURE    || '0.20'),
  education:  parseFloat(process.env.WEIGHT_EDUCATION  || '0.10'),
};

// ── Safe fallbacks when an agent fails ────────────────────────────────────────
const FALLBACK_SKILLS: SkillMatchResult = {
  matched: [], missing: [], partial: [],
  score: 0, reasoning: 'Skills analysis unavailable.',
};
const FALLBACK_EXPERIENCE: ExperienceResult = {
  score: 0, reasoning: 'Experience analysis unavailable.',
  strengths: [], weaknesses: [], seniority_fit: 'well-matched',
};
const FALLBACK_EDUCATION: EducationResult = {
  score: 50, reasoning: 'Education analysis unavailable.', meets_requirement: true,
};
const FALLBACK_CULTURE: CultureFitResult = {
  communication: 5, leadership: 5, ownership: 5, problem_solving: 5, adaptability: 5,
  overall_score: 50, reasoning: 'Culture analysis unavailable.',
  uncertainty_notes: 'Agent did not run.',
};
const FALLBACK_INTERVIEW: InterviewQuestionsResult = {
  technical: ['What technologies are you most comfortable with?'],
  behavioral: ['Describe a challenging project you completed.'],
  cultural: ['How do you handle feedback?'],
};
const FALLBACK_NARRATIVE: NarrativeResult = {
  summary: 'Narrative summary could not be generated.',
};

// ── Orchestrator decision agent prompt ────────────────────────────────────────
const DECISION_SYSTEM = `You are the final hiring committee member synthesising all evaluation data.
Based on the weighted scores and agent reports provided, produce a final hiring decision.

Return ONLY a JSON object with this exact schema:
{
  "overall_score": 74,
  "recommendation": "Hire",
  "reasoning": "Detailed paragraph explaining the final decision",
  "pros": ["Pro 1", "Pro 2", "Pro 3"],
  "cons": ["Con 1", "Con 2"],
  "risks": ["Risk if hired"],
  "confidence": 80
}

recommendation must be exactly one of: "Strong Hire", "Hire", "Maybe", "Reject"
overall_score: the weighted final score (integer 0-100)
pros: 3-5 concrete positives
cons: 1-4 concrete negatives
risks: 1-3 risks to consider if hired
confidence: 0-100 how confident you are in this recommendation`;

// ── Main orchestrator ──────────────────────────────────────────────────────────

export async function runAgentPipeline(
  resume: ParsedResume,
  jd: ParsedJD,
): Promise<Omit<AnalysisReport, 'resume' | 'jd'>> {
  console.log('[orchestrator] Running all agents in parallel…');

  // Step 1 — Run all independent agents simultaneously
  const [
    skillsResult,
    experienceResult,
    educationResult,
    cultureResult,
    interviewResult,
    narrativeResult,
  ] = await Promise.allSettled([
    skillMatchAgent(resume, jd),
    experienceAgent(resume, jd),
    educationAgent(resume, jd),
    cultureAgent(resume, jd),
    interviewAgent(resume, jd),
    narrativeAgent(resume, jd),
  ]);

  const skills    = skillsResult.status     === 'fulfilled' ? skillsResult.value     : FALLBACK_SKILLS;
  const experience = experienceResult.status === 'fulfilled' ? experienceResult.value : FALLBACK_EXPERIENCE;
  const education  = educationResult.status  === 'fulfilled' ? educationResult.value  : FALLBACK_EDUCATION;
  const culture    = cultureResult.status    === 'fulfilled' ? cultureResult.value    : FALLBACK_CULTURE;
  const interviewQuestions = interviewResult.status === 'fulfilled' ? interviewResult.value : FALLBACK_INTERVIEW;
  const narrativeData = narrativeResult.status === 'fulfilled' ? narrativeResult.value : FALLBACK_NARRATIVE;

  // Log any agent failures
  [skillsResult, experienceResult, educationResult, cultureResult, interviewResult, narrativeResult]
    .forEach((r, i) => {
      if (r.status === 'rejected') {
        const names = ['skills', 'experience', 'education', 'culture', 'interview', 'narrative'];
        console.error(`[orchestrator] Agent "${names[i]}" failed:`, r.reason);
      }
    });

  // Step 2 — Compute weighted score
  const weighted_score = Math.round(
    skills.score     * WEIGHTS.skills     +
    experience.score * WEIGHTS.experience +
    culture.overall_score * WEIGHTS.culture +
    education.score  * WEIGHTS.education,
  );

  // Step 3 — Run decision agent with all context
  let decision: HiringDecision;
  try {
    const decisionInput = `
ROLE: ${jd.role_title}
CANDIDATE: ${resume.name}

WEIGHTED OVERALL SCORE: ${weighted_score}/100
  - Skills score: ${skills.score}/100 (weight 40%)
  - Experience score: ${experience.score}/100 (weight 30%)
  - Culture score: ${culture.overall_score}/100 (weight 20%)
  - Education score: ${education.score}/100 (weight 10%)

SKILLS ANALYSIS:
  Matched: ${skills.matched.join(', ') || 'None'}
  Missing: ${skills.missing.join(', ') || 'None'}
  Partial: ${skills.partial.join(', ') || 'None'}
  Reasoning: ${skills.reasoning}

EXPERIENCE ANALYSIS:
  Seniority fit: ${experience.seniority_fit}
  Strengths: ${experience.strengths.join('; ')}
  Weaknesses: ${experience.weaknesses.join('; ')}
  Reasoning: ${experience.reasoning}

EDUCATION:
  Meets requirement: ${education.meets_requirement}
  Reasoning: ${education.reasoning}

CULTURE FIT:
  Overall: ${culture.overall_score}/100
  Reasoning: ${culture.reasoning}
  Uncertainty: ${culture.uncertainty_notes}

Based on all the above, produce the final HiringDecision JSON.
`.trim();

    decision = await callGemini<HiringDecision>(DECISION_SYSTEM, decisionInput);
    // Ensure overall_score matches our calculated weighted score
    decision.overall_score = weighted_score;
  } catch (err) {
    console.error('[orchestrator] Decision agent failed:', err);
    // Derive recommendation from score as fallback
    const rec: HiringDecision['recommendation'] =
      weighted_score >= 80 ? 'Strong Hire' :
      weighted_score >= 65 ? 'Hire' :
      weighted_score >= 45 ? 'Maybe' : 'Reject';
    decision = {
      overall_score: weighted_score,
      recommendation: rec,
      reasoning: 'Automated scoring based on agent outputs.',
      pros: experience.strengths,
      cons: experience.weaknesses,
      risks: [],
      confidence: 60,
    };
  }

  return {
    narrative_summary: narrativeData.summary,
    skills,
    experience,
    education,
    culture,
    weighted_score,
    decision,
    interview_questions: interviewQuestions,
    generated_at: new Date().toISOString(),
  };
}
