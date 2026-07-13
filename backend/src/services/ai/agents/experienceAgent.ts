import { callGemini } from '../callClaude';
import type { ParsedResume, ParsedJD, ExperienceResult } from '../types';

const SYSTEM = `You are a senior technical recruiter evaluating work experience.
Given a candidate's experience and a job description, assess relevance, depth, and seniority fit.

Return ONLY a JSON object with this exact schema:
{
  "score": 72,
  "reasoning": "Detailed reasoning paragraph",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1"],
  "seniority_fit": "well-matched"
}

Rules:
- score: integer 0-100 for how well experience fits the role
- strengths: 2-4 specific positive observations about their experience
- weaknesses: 1-3 specific gaps or concerns
- seniority_fit: one of "under-qualified", "well-matched", "over-qualified"
- reasoning: 3-5 sentences covering overall assessment`;

export async function experienceAgent(
  resume: ParsedResume,
  jd: ParsedJD,
): Promise<ExperienceResult> {
  const userMessage = `
ROLE BEING APPLIED FOR: ${jd.role_title}
EXPERIENCE REQUIRED BY JD: ${jd.experience_required}
JD RESPONSIBILITIES: ${JSON.stringify(jd.responsibilities)}

CANDIDATE EXPERIENCE:
${JSON.stringify(resume.experience, null, 2)}

CANDIDATE PROJECTS:
${JSON.stringify(resume.projects, null, 2)}

CANDIDATE CERTIFICATIONS: ${JSON.stringify(resume.certifications)}
`.trim();

  return callGemini<ExperienceResult>(SYSTEM, userMessage);
}
