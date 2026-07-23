const API_BASE = import.meta.env.VITE_API_URL;

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
  try {
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
  } catch (error: any) {
    return { status: 500, error: 'Network error or server unreachable.' };
  }
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

  verifyOTP: (email: string, otp: string) =>
    apiFetch<AuthPayload>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  requestSignupOTP: (email: string) =>
    apiFetch<{ message: string }>('/auth/request-signup-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifySignupOTP: (email: string, otp: string) =>
    apiFetch<{ message: string }>('/auth/verify-signup-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  resendOTP: (email: string) =>
    apiFetch<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // ── Forgot / reset password ──
  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyResetOTP: (email: string, otp: string) =>
    apiFetch<{ message: string }>('/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    apiFetch<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, new_password: newPassword }),
    }),
};
