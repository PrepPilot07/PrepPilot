const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Sub-types ──────────────────────────────────────────────────────────────────

export interface ParsedEducation {
  degree: string;
  institution: string;
  year: string;
  branch: string;
  gpa?: string | null;
}

export interface ParsedExperience {
  company: string;
  role: string;
  duration: string;
  responsibilities: string[];
  achievements: string[];
}

export interface ParsedProject {
  name: string;
  description: string;
  technologies: string[];
}

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  education: ParsedEducation[];
  experience: ParsedExperience[];
  skills: string[];
  projects: ParsedProject[];
  certifications: string[];
  summary: string;
}

export interface ParsedJD {
  role_title: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_required: string;
  education_required: string;
  responsibilities: string[];
  soft_skills: string[];
}

export interface RequirementMatch {
  requirement: string;
  category: string;
  importance: 'must_have' | 'nice_to_have';
  strength: 'strong' | 'partial' | 'weak' | 'none';
  confidence: number;
  evidence: string[];
  reasoning: string;
}

export interface GapAssessment {
  requirement: string;
  severity: 'hard_blocker' | 'learnable' | 'partially_covered';
  explanation: string;
}

export interface SkillAnalysis {
  matched: string[];
  missing: string[];
  partial: string[];
  score: number;
  reasoning: string;
  // Evidence-based fit analysis (LangGraph pipeline) — optional so this type
  // still matches older cached reports that predate the richer output.
  requirement_matches?: RequirementMatch[];
  gaps?: GapAssessment[];
}

export interface ExperienceResult {
  score: number;
  reasoning: string;
}

export interface EducationResult {
  score: number;
  reasoning: string;
  meets_requirement: boolean;
}

export interface CultureFitScore {
  communication: number;
  leadership: number;
  ownership: number;
  problem_solving: number;
  adaptability: number;
  overall_score: number;
  reasoning: string;
  uncertainty_notes: string;
}

export interface HiringDecision {
  overall_score: number;
  recommendation: 'Strong Hire' | 'Hire' | 'Maybe' | 'Reject';
  reasoning: string;
  pros: string[];
  cons: string[];
  risks: string[];
  confidence: number;
}

export interface InterviewQuestionsResult {
  technical: string[];
  behavioral: string[];
  cultural: string[];
  // legacy support for old 'questions' array
  questions?: string[];
}

export interface UploadResult {
  success: boolean;
  resume: ParsedResume;
  jd: ParsedJD;
  narrative_summary?: string;
  skills?: SkillAnalysis;
  experience?: ExperienceResult;
  education?: EducationResult;
  culture?: CultureFitScore;
  weighted_score?: number;
  decision?: HiringDecision;
  interview_questions?: InterviewQuestionsResult;
  generated_at?: string;
}

// ── API call ───────────────────────────────────────────────────────────────────

export async function uploadDocuments(
  token: string,
  resumeFile: File,
  jdText: string,
  days: number
): Promise<{ data?: UploadResult; error?: string; status: number }> {
  const formData = new FormData();
  formData.append('resume', resumeFile);
  formData.append('jdText', jdText);
  formData.append('days', String(days));

  try {
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { status: res.status, error: body.error || 'Upload failed — please try again.' };
    }

    return { status: res.status, data: body as UploadResult };
  } catch {
    return { status: 0, error: 'Network error — make sure the backend server is running.' };
  }
}

export async function fetchAnalysis(
  token: string
): Promise<{ data?: UploadResult; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/upload`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { status: res.status, error: body.error || 'Failed to fetch analysis' };
    }

    return { status: res.status, data: body as UploadResult };
  } catch {
    return { status: 0, error: 'Network error' };
  }
}
