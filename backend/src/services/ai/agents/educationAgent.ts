import { callGemini } from '../callClaude';
import type { ParsedResume, ParsedJD, EducationResult } from '../types';

const SYSTEM = `You are an HR specialist evaluating whether a candidate's educational background meets job requirements.

Return ONLY a JSON object with this exact schema:
{
  "score": 85,
  "reasoning": "Short explanation",
  "meets_requirement": true
}

Rules:
- score: integer 0-100 (100 = perfect match, 50 = acceptable, 0 = clearly unqualified)
- meets_requirement: true if education broadly satisfies the JD requirement (be lenient for experience-heavy roles)
- reasoning: 2-3 sentences`;

export async function educationAgent(
  resume: ParsedResume,
  jd: ParsedJD,
): Promise<EducationResult> {
  const userMessage = `
JD EDUCATION REQUIREMENT: ${jd.education_required || 'Not specified'}
ROLE: ${jd.role_title}

CANDIDATE EDUCATION:
${JSON.stringify(resume.education, null, 2)}

CANDIDATE CERTIFICATIONS: ${JSON.stringify(resume.certifications)}
`.trim();

  return callGemini<EducationResult>(SYSTEM, userMessage);
}
