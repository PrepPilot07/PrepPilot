// --- Shared Agent I/O Types ----------------------------------------------------

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

export interface SkillMatchResult {
  matched: string[];
  missing: string[];
  partial: string[];
  score: number;
  reasoning: string;
}

export interface ExperienceResult {
  score: number;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  seniority_fit: 'under-qualified' | 'well-matched' | 'over-qualified';
}

export interface EducationResult {
  score: number;
  reasoning: string;
  meets_requirement: boolean;
}

export interface CultureFitResult {
  communication: number;
  leadership: number;
  ownership: number;
  problem_solving: number;
  adaptability: number;
  overall_score: number;
  reasoning: string;
  uncertainty_notes: string;
}

export interface InterviewQuestionsResult {
  technical: string[];
  behavioral: string[];
  cultural: string[];
}

export interface NarrativeResult {
  summary: string;
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

export interface AnalysisReport {
  resume: ParsedResume;
  jd: ParsedJD;
  narrative_summary: string;
  skills: SkillMatchResult;
  experience: ExperienceResult;
  education: EducationResult;
  culture: CultureFitResult;
  weighted_score: number;
  decision: HiringDecision;
  interview_questions: InterviewQuestionsResult;
  generated_at: string;
}
