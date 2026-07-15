const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const { headers, ...restOptions } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { status: res.status, error: body.error || 'An unexpected error occurred' };
  }
  return { status: res.status, data: body as T };
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface TodayQuestion {
  id: string;
  day_number: number;
  topic: string;
  question_text: string;
  learning_goal: string | null;
  difficulty: string | null;
  focus_skill: string | null;
  already_answered: boolean;
}

export interface TrendPoint {
  day: string;
  score: number;
}

export interface TopicConfidence {
  topic: string;
  percent: number;
}

export interface DashboardData {
  name: string;
  role_title: string | null;
  readiness_score: number;
  readiness_delta_week: number;
  sessions_this_week: number;
  sessions_goal: number;
  days_until_interview: number | null;
  today_question: TodayQuestion | null;
  whatsapp_connected: boolean;
  readiness_trend: TrendPoint[];
  topic_confidence: TopicConfidence[];
  streak_days: number;
  weekly_review_summary: string;
}

export interface PracticeAnswerResponse {
  success: boolean;
  readiness_score: number;
  sessions_this_week: number;
  today_question: TodayQuestion | null;
}

// ── API calls ───────────────────────────────────────────────────────────────

export function fetchDashboard(token: string) {
  return apiFetch<DashboardData>('/api/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function submitPracticeAnswer(token: string, questionId: string, answerText: string) {
  return apiFetch<PracticeAnswerResponse>('/api/dashboard/practice-answer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ question_id: questionId, answer_text: answerText }),
  });
}
