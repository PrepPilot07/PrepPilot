import { callGemini } from '../callClaude';
import type { ParsedResume, ParsedJD, InterviewQuestionsResult } from '../types';

const SYSTEM = `You are an expert technical interviewer. Generate targeted interview questions for a candidate.
Questions must be specific to THIS candidate's background and THIS role — not generic.
Mix questions that probe strengths, challenge weaknesses, and explore culture fit.

Return ONLY a JSON object with this exact schema:
{
  "technical": [
    "Question 1?",
    "Question 2?",
    "Question 3?"
  ],
  "behavioral": [
    "Question 1?",
    "Question 2?"
  ],
  "cultural": [
    "Question 1?",
    "Question 2?"
  ]
}

Rules:
- technical: 4-5 questions probing technical depth, specific to their stack and the role's requirements
- behavioral: 3-4 STAR-method questions based on their actual experience
- cultural: 2-3 questions probing values, collaboration, and growth mindset
- Make each question specific — reference their actual companies, projects, or skills`;

export async function interviewAgent(
  resume: ParsedResume,
  jd: ParsedJD,
): Promise<InterviewQuestionsResult> {
  const userMessage = `
CANDIDATE: ${resume.name}
ROLE APPLYING FOR: ${jd.role_title}

CANDIDATE'S KEY SKILLS: ${resume.skills.slice(0, 15).join(', ')}
CANDIDATE'S EXPERIENCE: ${JSON.stringify(
    resume.experience.map((e: { role: string; company: string; duration: string }) => `${e.role} at ${e.company} (${e.duration})`),
  )}
CANDIDATE'S NOTABLE PROJECTS: ${JSON.stringify(
    resume.projects.map((p: { name: string; description: string }) => `${p.name}: ${p.description}`),
  )}

JD REQUIRED SKILLS (focus technical questions on gaps): ${JSON.stringify(jd.required_skills)}
JD RESPONSIBILITIES: ${JSON.stringify(jd.responsibilities.slice(0, 5))}
`.trim();

  return callGemini<InterviewQuestionsResult>(SYSTEM, userMessage);
}
