import { callGemini } from '../callClaude';
import type { ParsedResume, ParsedJD, NarrativeResult } from '../types';

const SYSTEM = `You are a senior recruiter writing an executive summary for an internal hiring committee.
Write a professional, balanced, and honest paragraph summarising the candidate's fit for the role.
Be specific — mention real details from their background.

Return ONLY a JSON object with this exact schema:
{
  "summary": "Full executive summary paragraph here."
}

Rules:
- 4-6 sentences
- Mention the candidate's name and the role
- Highlight top strengths and key concerns
- End with a clear hiring signal (positive, cautious, or negative)
- Formal recruiter tone`;

export async function narrativeAgent(
  resume: ParsedResume,
  jd: ParsedJD,
): Promise<NarrativeResult> {
  const userMessage = `
CANDIDATE: ${resume.name}
ROLE: ${jd.role_title}
SKILLS: ${resume.skills.slice(0, 12).join(', ')}
EXPERIENCE SUMMARY: ${resume.experience
    .map((e: { role: string; company: string; duration: string }) => `${e.role} at ${e.company} (${e.duration})`)
    .join('; ')}
EDUCATION: ${resume.education
    .map((e: { degree: string; branch: string; institution: string; year: string }) => `${e.degree} in ${e.branch} from ${e.institution} (${e.year})`)
    .join('; ')}
CERTIFICATIONS: ${resume.certifications.join(', ') || 'None'}
PROJECTS: ${resume.projects
    .map((p: { name: string }) => p.name)
    .join(', ')}
CANDIDATE SUMMARY: ${resume.summary || 'Not provided'}
`.trim();

  return callGemini<NarrativeResult>(SYSTEM, userMessage);
}
