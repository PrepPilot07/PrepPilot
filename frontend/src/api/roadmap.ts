const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Types ──────────────────────────────────────────────────────────────────────

export type DayStatus = 'locked' | 'today' | 'up_next' | 'completed';

export interface RoadmapDay {
  id: string;
  day_number: number;
  topic: string;
  question_text: string;
  learning_goal: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  focus_skill: string | null;
  status: DayStatus;
  completed_at: string | null;
  has_practice_content: boolean;
  sent_at: string | null;
}

export interface RoadmapResponse {
  roadmap_id: string;
  interview_date: string;   // ISO date string, e.g. "2026-07-30"
  created_at: string;
  // True when this plan wasn't built from the analysis currently on file —
  // i.e. a newer analysis exists and regeneration hasn't succeeded since.
  is_stale: boolean;
  completed_count: number;
  days: RoadmapDay[];
}

export interface PracticeResource {
  title: string;
  url: string;
}

export interface PracticeQuestion {
  id: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PracticeContent {
  id: string;
  topic: string;
  description: string | null;
  resources: PracticeResource[];
  questions: PracticeQuestion[];
}

export interface CompleteDayResult {
  day: { id: string; day_number: number; topic: string; status: DayStatus; completed_at: string };
  next_day: { id: string; day_number: number; topic: string; status: DayStatus } | null;
  completed_count: number;
}

export interface PracticeAnswer {
  id: string;
  day_id: string;
  question_id: string;
  answer_text: string;
  source: 'web' | 'whatsapp';
  ai_score: number | null;
  ai_feedback: string | null;
  created_at: string;
}

// ── API call ───────────────────────────────────────────────────────────────────

export async function fetchRoadmap(
  token: string
): Promise<{ data?: RoadmapResponse; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/roadmap`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { status: res.status, error: (body as { error?: string }).error || 'Failed to fetch roadmap' };
    }

    return { status: res.status, data: body as RoadmapResponse };
  } catch {
    return { status: 0, error: 'Network error — make sure the backend server is running.' };
  }
}

export async function fetchPractice(
  token: string,
  dayId: string
): Promise<{ data?: PracticeContent; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/roadmap/${dayId}/practice`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: res.status, error: (body as { error?: string }).error || 'Failed to load practice content' };
    }
    return { status: res.status, data: body as PracticeContent };
  } catch {
    return { status: 0, error: 'Network error — make sure the backend server is running.' };
  }
}

export async function generateRoadmap(
  token: string,
  days: number
): Promise<{ data?: RoadmapResponse; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/roadmap/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ days }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: res.status, error: (body as { error?: string }).error || 'Failed to generate roadmap' };
    }
    return { status: res.status, data: body as RoadmapResponse };
  } catch {
    return { status: 0, error: 'Network error — make sure the backend server is running.' };
  }
}

export async function fetchDayAnswers(
  token: string,
  dayId: string
): Promise<{ data?: PracticeAnswer[]; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/roadmap/${dayId}/answers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: res.status, error: (body as { error?: string }).error || 'Failed to fetch answers' };
    }
    return { status: res.status, data: (body as { answers: PracticeAnswer[] }).answers };
  } catch {
    return { status: 0, error: 'Network error — make sure the backend server is running.' };
  }
}

export async function submitAnswer(
  token: string,
  dayId: string,
  questionId: string,
  answerText: string
): Promise<{ data?: PracticeAnswer; error?: string; status: number }> {
  try {
    const res = await fetch(
      `${API_BASE}/api/roadmap/${dayId}/questions/${questionId}/answers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answer_text: answerText }),
      }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: res.status, error: (body as { error?: string }).error || 'Failed to submit answer' };
    }
    return { status: res.status, data: body as PracticeAnswer };
  } catch {
    return { status: 0, error: 'Network error — make sure the backend server is running.' };
  }
}

export async function completeDay(
  token: string,
  dayId: string
): Promise<{ data?: CompleteDayResult; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/roadmap/${dayId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: res.status, error: (body as { error?: string }).error || 'Failed to mark day as complete' };
    }
    return { status: res.status, data: body as CompleteDayResult };
  } catch {
    return { status: 0, error: 'Network error — make sure the backend server is running.' };
  }
}
