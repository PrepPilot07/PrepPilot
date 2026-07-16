import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  Sparkles,
  Unlock,
  Flame,
  MessageSquare,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  AppNotification,
  NotificationType,
} from '../api/notifications';

// Refresh the badge periodically while mounted. Fetch-on-open covers the panel
// itself; this keeps the unread count roughly current without a websocket.
const POLL_MS = 60_000;

// ── Relative timestamp ("2h ago") ─────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Per-type icon ─────────────────────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, { icon: React.ReactNode; tint: string }> = {
  answer_scored: { icon: <Sparkles size={14} />, tint: 'bg-emerald-50 text-emerald-600' },
  day_unlocked: { icon: <Unlock size={14} />, tint: 'bg-indigo-50 text-indigo-600' },
  streak: { icon: <Flame size={14} />, tint: 'bg-amber-50 text-amber-600' },
  whatsapp: { icon: <MessageSquare size={14} />, tint: 'bg-emerald-50 text-emerald-600' },
};

export default function NotificationBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const res = await fetchNotifications(token);
    setLoading(false);
    if (res.data) {
      setItems(res.data.notifications);
      setUnread(res.data.unread_count);
    }
  }, [token]);

  // Initial fetch (for the badge) + light polling while mounted.
  useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // Refetch when the panel is opened so it shows the latest.
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Escape to close; click outside to dismiss. Restore focus to the bell on
  // close so keyboard users aren't stranded.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'Tab') {
        // Simple focus trap: keep Tab cycling within the panel.
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    // Move focus into the panel when it opens.
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const handleItemClick = async (n: AppNotification) => {
    if (n.is_read || !token) return;
    // Optimistic: mark read locally, then persist.
    setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, is_read: true } : it)));
    setUnread((u) => Math.max(0, u - 1));
    await markNotificationRead(token, n.id);
  };

  const handleMarkAll = async () => {
    if (!token || unread === 0) return;
    setItems((prev) => prev.map((it) => ({ ...it, is_read: true })));
    setUnread(0);
    await markAllNotificationsRead(token);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        className="relative w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
      >
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">Notifications</span>
              {unread > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  {unread} new
                </span>
              )}
            </div>
            <button
              onClick={handleMarkAll}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center px-6 py-10">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <Bell size={18} />
                </div>
                <p className="text-sm font-medium text-gray-600">You're all caught up</p>
                <p className="text-xs text-gray-400 mt-1">
                  Scores and unlocked days will show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {items.map((n) => {
                  const meta = TYPE_ICON[n.type] ?? TYPE_ICON.answer_scored;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleItemClick(n)}
                        className={`w-full text-left flex gap-3 px-4 py-3 transition-colors ${
                          n.is_read ? 'hover:bg-gray-50' : 'bg-emerald-50/40 hover:bg-emerald-50/70'
                        }`}
                      >
                        <span
                          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${meta.tint}`}
                        >
                          {meta.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-[13px] leading-snug ${
                              n.is_read ? 'text-gray-600 font-normal' : 'text-gray-900 font-semibold'
                            }`}
                          >
                            {n.message}
                          </span>
                          <span className="block text-[11px] text-gray-400 mt-0.5">
                            {timeAgo(n.created_at)}
                          </span>
                        </span>
                        {!n.is_read && (
                          <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
