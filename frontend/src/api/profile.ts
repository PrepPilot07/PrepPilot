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

export interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  roleTitle: string | null;
  whatsappNumber: string | null;
  createdAt: string;
}

export function fetchProfile(token: string) {
  return apiFetch<ProfileData>('/profile/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateProfileName(token: string, name: string) {
  return apiFetch<{ id: string; email: string; name: string }>('/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
}

export function changePassword(token: string, currentPassword: string, newPassword: string) {
  return apiFetch<{ success: boolean }>('/profile/password', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function deleteAccount(token: string, password: string) {
  return apiFetch<{ success: boolean }>('/profile', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
}
