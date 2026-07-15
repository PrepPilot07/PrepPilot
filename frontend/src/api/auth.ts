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

export interface AuthPayload {
  token: string;
  user: { id: string; email: string; name: string | null };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  whatsappNumber: string | null;
  createdAt: string;
}

export const authApi = {
  signup: (email: string, password: string, name: string) =>
    apiFetch<AuthPayload>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    apiFetch<AuthPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getProfile: (token: string) =>
    apiFetch<UserProfile>('/profile/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),
};
