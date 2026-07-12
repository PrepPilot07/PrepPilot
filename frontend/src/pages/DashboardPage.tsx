import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { authApi, UserProfile } from '../api/auth';

// ── Icons ────────────────────────────────────────────────────────────────────

function IconBrain() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
    </svg>
  );
}

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  );
}

function IconMessage() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold mb-0.5 ${color}`}>{value}</p>
      <p className="text-xs text-gray-600">{sub}</p>
    </div>
  );
}

// ── Step Card ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  icon,
  title,
  desc,
  cta,
  active,
  done,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`card p-6 flex flex-col gap-4 transition-all duration-300 ${
        done
          ? 'opacity-50'
          : active
          ? 'border-violet-700/50 shadow-[0_0_30px_-8px_rgba(139,92,246,0.25)]'
          : 'opacity-40'
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            done
              ? 'bg-green-900/30 text-green-400'
              : active
              ? 'bg-violet-900/40 text-violet-400'
              : 'bg-gray-800 text-gray-600'
          }`}
        >
          {done ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            icon
          )}
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            done
              ? 'bg-green-900/20 text-green-500'
              : active
              ? 'bg-violet-900/30 text-violet-400'
              : 'bg-gray-800 text-gray-600'
          }`}
        >
          {done ? 'Done' : active ? 'Up next' : `Step ${step}`}
        </span>
      </div>

      <div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>

      {active && (
        <button
          className="mt-auto flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors group"
          disabled
        >
          {cta}
          <IconChevronRight />
        </button>
      )}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    authApi.getProfile(token).then(result => {
      setLoading(false);
      if (!result.data) {
        if (result.status === 401) {
          logout();
          navigate('/login');
        }
      } else {
        setProfile(result.data);
      }
    });
  }, [token, navigate, logout]);

  const firstName = user?.email?.split('@')[0] ?? 'there';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-10 border-b border-gray-800/70 bg-gray-950/80 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-bold text-white tracking-tight">PrepPilot</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-gray-500">{user?.email}</span>
            <button
              id="logout-button"
              onClick={() => { logout(); navigate('/login'); }}
              className="text-sm text-gray-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-900/20"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-10">

        {/* Hero greeting */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm text-violet-400 font-medium mb-1 uppercase tracking-widest">Dashboard</p>
            <h1 className="text-3xl font-bold text-white">
              Hey, {firstName} 👋
            </h1>
            <p className="text-gray-500 mt-1.5 text-sm leading-relaxed max-w-md">
              Your AI-powered interview coach. One sharp question a day, honest feedback, and a readiness score that actually moves.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-800/40 border border-gray-700/50 rounded-xl px-4 py-2.5 self-start sm:self-auto">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Account active since {profile ? new Date(profile.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Questions Sent"    value="0"   sub="Starts after setup"    color="text-white" />
          <StatCard label="Answers Reviewed"  value="0"   sub="Responses analysed"    color="text-white" />
          <StatCard label="Readiness Score"   value="—"   sub="Unlocks after 3 days"  color="text-violet-400" />
          <StatCard label="Days Until Ready"  value="—"   sub="Set your interview date" color="text-indigo-400" />
        </div>

        {/* Setup journey */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-900/30 text-violet-400">
              <IconTarget />
            </div>
            <h2 className="font-semibold text-white">Your Setup Journey</h2>
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">1 of 4 complete</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StepCard
              step={1}
              icon={<IconBrain />}
              title="Create Account"
              desc="Sign up and secure your PrepPilot account with email and password."
              cta=""
              active={false}
              done={true}
            />
            <StepCard
              step={2}
              icon={<IconUpload />}
              title="Upload Resume + JD"
              desc="Drop in your CV and the job description. Claude will extract your skills and flag the gaps."
              cta="Upload your documents"
              active={true}
              done={false}
            />
            <StepCard
              step={3}
              icon={<IconMap />}
              title="Review Your Roadmap"
              desc="Get a personalised day-by-day prep plan tailored to your target role and timeline."
              cta="View roadmap"
              active={false}
              done={false}
            />
            <StepCard
              step={4}
              icon={<IconWhatsApp />}
              title="Connect WhatsApp"
              desc="Start receiving one targeted question every morning — straight to your phone."
              cta="Connect WhatsApp"
              active={false}
              done={false}
            />
          </div>
        </div>

        {/* Today's question placeholder */}
        <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-900/30 border border-indigo-800/40 flex items-center justify-center text-indigo-400 shrink-0">
            <IconMessage />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Today's Question</p>
            <p className="text-sm text-gray-400">
              Your daily question will appear here once you've uploaded your resume and connected WhatsApp. Complete the setup steps above to get started.
            </p>
          </div>
          <div className="text-xs text-gray-700 bg-gray-800/60 rounded-xl px-3 py-2 whitespace-nowrap self-start sm:self-auto">
            Not started
          </div>
        </div>

        {/* WhatsApp promo */}
        <div className="rounded-2xl overflow-hidden border border-green-800/30 bg-gradient-to-br from-green-950/40 to-gray-900 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-green-900/40 border border-green-800/30 flex items-center justify-center text-green-400 shrink-0">
            <IconWhatsApp />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">Coaching over WhatsApp</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              PrepPilot texts you like a mentor — one sharp question every morning, honest feedback on your answer, and a readiness score that moves as you improve.
            </p>
          </div>
          <button
            disabled
            className="shrink-0 px-4 py-2.5 rounded-xl bg-green-700/30 border border-green-600/30 text-green-400 text-sm font-medium cursor-not-allowed opacity-60"
          >
            Coming soon
          </button>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800/50 py-5 text-center text-xs text-gray-700">
        PrepPilot · AI interview coaching over WhatsApp · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
