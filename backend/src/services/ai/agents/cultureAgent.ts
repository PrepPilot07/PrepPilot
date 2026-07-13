import { callGemini } from '../callClaude';
import type { ParsedResume, ParsedJD, CultureFitResult } from '../types';

const SYSTEM = `You are an organizational psychologist inferring soft skills and culture fit from a resume.
You cannot directly interview the candidate — you must infer from written evidence only.
Be honest about uncertainty; do not fabricate signals that aren't present.

Return ONLY a JSON object with this exact schema:
{
  "communication": 7,
  "leadership": 5,
  "ownership": 8,
  "problem_solving": 7,
  "adaptability": 6,
  "overall_score": 66,
  "reasoning": "Detailed reasoning paragraph",
  "uncertainty_notes": "What you cannot assess from a resume alone"
}

Rules:
- Each dimension score: integer 0-10
- overall_score: integer 0-100 (not an average; holistic judgment)
- reasoning: 3-4 sentences referencing specific resume evidence
- uncertainty_notes: honest 1-2 sentence caveat`;

export async function cultureAgent(
  resume: ParsedResume,
  jd: ParsedJD,
): Promise<CultureFitResult> {
  const userMessage = `
ROLE: ${jd.role_title}
JD SOFT SKILLS MENTIONED: ${JSON.stringify(jd.soft_skills)}

CANDIDATE SUMMARY: ${resume.summary || 'Not provided'}
CANDIDATE EXPERIENCE (responsibilities & achievements):
${JSON.stringify(
  resume.experience.map((e: { role: string; company: string; responsibilities: string[]; achievements: string[] }) => ({
    role: e.role,
    company: e.company,
    responsibilities: e.responsibilities,
    achievements: e.achievements,
  })),
  null,
  2,
)}
CANDIDATE PROJECTS: ${JSON.stringify(resume.projects.map((p: { description: string }) => p.description))}
`.trim();

  return callGemini<CultureFitResult>(SYSTEM, userMessage);
}
