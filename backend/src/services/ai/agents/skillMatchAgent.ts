import { callGemini } from '../callClaude';
import type { ParsedResume, ParsedJD, SkillMatchResult } from '../types';

const SYSTEM = `You are a technical recruiter specialising in skills assessment.
You will receive a candidate's skills list and a job description's required and preferred skills.
Carefully compare them — be case-insensitive and account for synonyms (e.g. "JS" = "JavaScript", "Postgres" = "PostgreSQL").

Return ONLY a JSON object with this exact schema:
{
  "matched": ["skill1", "skill2"],
  "missing": ["skill3"],
  "partial": ["skill4"],
  "score": 75,
  "reasoning": "Short explanation of the score"
}

Rules:
- matched: skills clearly present in both resume and JD
- missing: required JD skills completely absent from resume
- partial: resume has a related but not identical skill
- score: integer 0-100 representing how well skills match REQUIRED skills (preferred skills are bonus)
- reasoning: 2-3 sentences max`;

export async function skillMatchAgent(
  resume: ParsedResume,
  jd: ParsedJD,
): Promise<SkillMatchResult> {
  const userMessage = `
CANDIDATE SKILLS: ${JSON.stringify(resume.skills)}
RESUME PROJECTS TECHNOLOGIES: ${JSON.stringify(resume.projects.map((p: { technologies: string[] }) => p.technologies).flat())}
JD REQUIRED SKILLS: ${JSON.stringify(jd.required_skills)}
JD PREFERRED SKILLS: ${JSON.stringify(jd.preferred_skills)}
ROLE: ${jd.role_title}
`.trim();

  return callGemini<SkillMatchResult>(SYSTEM, userMessage);
}
