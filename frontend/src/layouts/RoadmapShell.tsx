import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { fetchProfile } from '../api/profile';
import {
  LayoutGrid,
  Map,
  MessageSquare,
  Plus,
  HelpCircle,
  Settings,
  LogOut,
  Flame,
  FileText,
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import AboutModal from '../components/AboutModal';

// ── Sidebar nav item ──────────────────────────────────────────────────────────

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
        active
          ? 'bg-emerald-50 text-emerald-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }`}
    >
      <span className={`${active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'} transition-colors`}>
        {icon}
      </span>
      {label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
    </button>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────────

export default function RoadmapShell() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [roleTitle, setRoleTitle] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchProfile(token).then(res => {
      if (res.data?.roleTitle) setRoleTitle(res.data.roleTitle);
    });
  }, [token]);

  // Derive user display info
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Today's date in long format
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-['Inter',sans-serif]">

      {/* ── Fixed Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-[230px] shrink-0 flex flex-col h-screen bg-white border-r border-gray-200 overflow-y-auto">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-bold text-gray-900 tracking-tight text-[15px]">PrepPilot</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Your Workspace
          </p>

          <NavItem
            icon={<LayoutGrid size={16} />}
            label="Dashboard"
            active={currentPath === '/dashboard'}
            onClick={() => navigate('/dashboard')}
          />
          <NavItem
            icon={<FileText size={16} />}
            label="Analysis"
            active={currentPath === '/analysis'}
            onClick={() => navigate('/analysis')}
          />
          <NavItem
            icon={<Map size={16} />}
            label="Roadmap"
            active={currentPath === '/roadmap'}
            onClick={() => navigate('/roadmap')}
          />
          <NavItem
            icon={<MessageSquare size={16} />}
            label="WhatsApp"
            active={currentPath === '/whatsapp'}
            onClick={() => navigate('/whatsapp')}
          />
          <NavItem
            icon={<Plus size={16} />}
            label="New plan"
            active={currentPath === '/upload'}
            onClick={() => navigate('/upload')}
          />
        </nav>

        {/* Streak nudge card */}
        <div className="mx-3 mb-3 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Keep the momentum</span>
          </div>
          <p className="text-[11px] text-emerald-600 leading-relaxed">
            Stay consistent — one day at a time builds real confidence for the interview.
          </p>
        </div>

        {/* Settings */}
        <div className="px-3 pb-2">
          <NavItem
            icon={<Settings size={16} />}
            label="Settings"
            active={currentPath === '/settings'}
            onClick={() => navigate('/settings')}
          />
        </div>

        {/* User row */}
        <div className="px-3 pb-4 border-t border-gray-100 pt-3 relative">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/settings')}
              className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 hover:bg-emerald-700 transition-colors"
              title="Settings"
            >
              <span className="text-white text-xs font-semibold">{initials}</span>
            </button>
            <button onClick={() => navigate('/settings')} className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-semibold text-gray-800 truncate">{displayName}</p>
              <p className="text-[11px] text-gray-400 truncate">{roleTitle || 'Interview candidate'}</p>
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>

          {/* Logout confirm popover */}
          {showLogoutConfirm && (
            <div className="absolute bottom-full left-3 right-3 mb-2 p-3 bg-white rounded-xl border border-gray-200 shadow-lg z-50">
              <p className="text-xs text-gray-600 mb-2.5">Are you sure you want to log out?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="flex-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Log out
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-3 py-1.5 text-gray-600 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-[58px] shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="font-medium text-gray-800">
              {currentPath === '/dashboard' ? 'Dashboard' : currentPath === '/analysis' ? 'Analysis Report' : currentPath === '/upload' ? 'New Plan' : currentPath === '/settings' ? 'Settings' : currentPath === '/whatsapp' ? 'WhatsApp connection' : 'Your Roadmap'}
            </span>
            <span className="text-gray-300">|</span>
            <span>{today}</span>
          </div>
          {/* Action icons */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => setShowAbout(true)}
              aria-label="About PrepPilot"
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
            >
              <HelpCircle size={15} />
            </button>
          </div>
        </header>

        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

        {/* Page content via Outlet */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
