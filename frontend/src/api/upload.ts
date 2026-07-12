const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Types ─────────────────────────────────────────────────────────────────────

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

export interface UploadResult {
  success: boolean;
  resume: ParsedResume;
  jd: ParsedJD;
}

// ── API call ──────────────────────────────────────────────────────────────────

export async function uploadDocuments(
  token: string,
  resumeFile: File,
  jdText: string
): Promise<{ data?: UploadResult; error?: string; status: number }> {
  const formData = new FormData();
  formData.append('resume', resumeFile);
  formData.append('jdText', jdText);

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
