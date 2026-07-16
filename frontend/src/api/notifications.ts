const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Types ──────────────────────────────────────────────────────────────────────

// 'answer_scored' and 'day_unlocked' are backed by real events today.
// 'streak' and 'whatsapp' are reserved for when those features emit events.
export type NotificationType = 'answer_scored' | 'day_unlocked' | 'streak' | 'whatsapp';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function fetchNotifications(
  token: string
): Promise<{ data?: NotificationsResponse; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: res.status, error: (body as { error?: string }).error || 'Failed to fetch notifications' };
    }
    return { status: res.status, data: body as NotificationsResponse };
  } catch {
    return { status: 0, error: 'Network error — make sure the backend server is running.' };
  }
}

export async function markNotificationRead(
  token: string,
  id: string
): Promise<{ error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { status: res.status, error: (body as { error?: string }).error || 'Failed to mark as read' };
    }
    return { status: res.status };
  } catch {
    return { status: 0, error: 'Network error — make sure the backend server is running.' };
  }
}

export async function markAllNotificationsRead(
  token: string
): Promise<{ error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { status: res.status, error: (body as { error?: string }).error || 'Failed to mark all as read' };
    }
    return { status: res.status };
  } catch {
    return { status: 0, error: 'Network error — make sure the backend server is running.' };
  }
}
