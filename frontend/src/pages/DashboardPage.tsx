import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { fetchDashboard, submitPracticeAnswer, type DashboardData } from '../api/dashboard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Sparkles,
  Target,
  Calendar,
  ArrowRight,
  Send,
  MessageCircle,
  TrendingUp,
  Flame,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function difficultyColor(d: string | null) {
  switch (d) {
    case 'easy': return 'bg-emerald-400';
    case 'medium': return 'bg-amber-400';
    case 'hard': return 'bg-rose-400';
    default: return 'bg-gray-300';
  }
}

// ── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="url(#dashRingGrad)" strokeWidth={strokeWidth}
          fill="none" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <defs>
          <linearGradient id="dashRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black text-gray-900">{score}</p>
        <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Ready</p>
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ from: 'bot' | 'user'; text: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchDashboard(token).then(res => {
      setLoading(false);
      if (res.data) {
        setData(res.data);
        if (res.data.today_question && !res.data.today_question.already_answered) {
          setChatMessages([{ from: 'bot', text: res.data.today_question.question_text }]);
        }
      }
    });
  }, [token, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSubmitAnswer = async () => {
    if (!token || !data?.today_question || submitting || !answerText.trim()) return;
    setSubmitting(true);
    setChatMessages(prev => [...prev, { from: 'user', text: answerText.trim() }]);
    const answer = answerText.trim();
    setAnswerText('');

    const res = await submitPracticeAnswer(token, data.today_question.id, answer);
    setSubmitting(false);

    if (res.data) {
      setData(prev => prev ? {
        ...prev,
        readiness_score: res.data!.readiness_score,
        sessions_this_week: res.data!.sessions_this_week,
        today_question: res.data!.today_question,
      } : prev);
      setChatMessages(prev => [...prev, { from: 'bot', text: 'Answer recorded! Great work. Move on to your next question when ready.' }]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-gray-500">Failed to load dashboard.</p>
      </div>
    );
  }

  const {
    name, role_title, readiness_score, readiness_delta_week,
    sessions_this_week, sessions_goal, days_until_interview,
    today_question, whatsapp_connected, readiness_trend,
    topic_confidence, streak_days, weekly_review_summary,
  } = data;

  const sessionsRemaining = Math.max(0, sessions_goal - sessions_this_week);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-500">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
            Your Interview Prep
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            {getGreeting()}, {name}
            <Sparkles size={20} className="text-emerald-500" />
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {role_title
              ? `Preparing for ${role_title}. Stay consistent, one day at a time.`
              : 'Upload your resume and target role to start your prep journey.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/roadmap')}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition-colors"
        >
          View roadmap
          <ArrowRight size={14} />
        </button>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Readiness Score */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center gap-5">
          <ScoreRing score={readiness_score} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Readiness Score</p>
            <p className="text-sm text-gray-600">
              {readiness_delta_week > 0
                ? <span className="text-emerald-600 font-semibold">+{readiness_delta_week} this week</span>
                : readiness_delta_week === 0
                  ? <span className="text-gray-500">No change this week</span>
                  : <span className="text-red-500 font-semibold">{readiness_delta_week} this week</span>
              }
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Based on analysis + practice</p>
          </div>
        </div>

        {/* Practice This Week */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-emerald-600" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Practice This Week</p>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-black text-gray-900">{sessions_this_week}</span>
            <span className="text-lg text-gray-400 font-semibold mb-0.5">/ {sessions_goal}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${(sessions_this_week / sessions_goal) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {sessionsRemaining > 0
              ? `${sessionsRemaining} session${sessionsRemaining > 1 ? 's' : ''} left to reach your goal`
              : 'Weekly goal reached!'}
          </p>
        </div>

        {/* Next Interview */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-violet-600" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Next Interview</p>
          </div>
          {days_until_interview !== null ? (
            <>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-3xl font-black text-gray-900">{days_until_interview}</span>
                <span className="text-sm text-gray-500 mb-1 font-medium">days</span>
              </div>
              {role_title && <p className="text-xs text-gray-500 mb-3">{role_title}</p>}
              <button
                onClick={() => navigate('/roadmap')}
                className="text-xs text-violet-600 font-semibold flex items-center gap-1 hover:text-violet-700 transition-colors"
              >
                Review your focus <ChevronRight size={12} />
              </button>
            </>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-2">No interview date set</p>
              <button
                onClick={() => navigate('/upload')}
                className="text-xs text-violet-600 font-semibold flex items-center gap-1 hover:text-violet-700 transition-colors"
              >
                Set your interview date <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Today's coaching ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Question card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <BookOpen size={16} className="text-emerald-600" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Today's Coaching</p>
            {streak_days > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <Flame size={12} /> {streak_days} day streak
              </span>
            )}
          </div>

          {today_question ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${difficultyColor(today_question.difficulty)}`} />
                <span className="text-xs text-gray-500 font-medium">Day {today_question.day_number} &middot; {today_question.topic}</span>
                <span className="ml-auto text-[11px] text-gray-400">~10 min</span>
              </div>
              <p className="text-[15px] font-semibold text-gray-900 leading-relaxed mb-4">
                {today_question.question_text}
              </p>
              {today_question.learning_goal && (
                <>
                  <div className="h-px bg-gray-100 mb-3" />
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-600">Today's goal:</span> {today_question.learning_goal}
                  </p>
                </>
              )}
              {today_question.already_answered && (
                <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Completed
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm mb-3">No coaching question available yet.</p>
              <button
                onClick={() => navigate('/upload')}
                className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                Upload resume & JD to get started →
              </button>
            </div>
          )}
        </div>

        {/* Right: Chat/answer card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">PrepPilot</p>
              <p className="text-[11px] text-gray-400">Your interview coach</p>
            </div>
            {!whatsapp_connected && (
              <button
                onClick={() => navigate('/whatsapp')}
                className="ml-auto text-[11px] text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1"
              >
                <MessageCircle size={12} /> Connect WhatsApp
              </button>
            )}
          </div>

          {/* Chat body */}
          <div className="flex-1 px-5 py-4 space-y-3 overflow-y-auto max-h-[260px] min-h-[180px] bg-gray-50/50">
            {chatMessages.length === 0 && (
              <p className="text-xs text-gray-400 text-center pt-8">
                {today_question ? 'Your question will appear here.' : 'Upload documents to receive daily coaching.'}
              </p>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.from === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          {today_question && !today_question.already_answered && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
              <input
                type="text"
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitAnswer(); } }}
                placeholder="Type a practice answer..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                disabled={submitting}
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || !answerText.trim()}
                className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Readiness Trend + Topic Confidence ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Readiness Trend Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Readiness Trend</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-gray-900">{readiness_score}</span>
              {readiness_delta_week !== 0 && (
                <span className={`font-semibold ${readiness_delta_week > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {readiness_delta_week > 0 ? '+' : ''}{readiness_delta_week}
                </span>
              )}
            </div>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={readiness_trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="readinessGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#readinessGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Confidence */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Target size={16} className="text-violet-600" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Topic Confidence</p>
          </div>
          {topic_confidence.length > 0 ? (
            <div className="space-y-3.5">
              {topic_confidence.map((tc, i) => {
                const colors = ['bg-emerald-500', 'bg-teal-500', 'bg-violet-500', 'bg-blue-500', 'bg-amber-500', 'bg-rose-500'];
                const color = colors[i % colors.length];
                return (
                  <div key={tc.topic} className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                    <span className="text-sm text-gray-700 flex-1 truncate">{tc.topic}</span>
                    <span className="text-xs font-semibold text-gray-900 w-8 text-right">{tc.percent}%</span>
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${tc.percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">Upload your resume to see topic analysis.</p>
          )}
          {topic_confidence.length > 0 && (
            <button
              onClick={() => navigate('/roadmap')}
              className="mt-5 text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:text-emerald-700 transition-colors"
            >
              See your complete roadmap <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Bottom row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly Review */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-emerald-600" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Weekly Review</p>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            {weekly_review_summary}
          </p>
          <button
            onClick={() => navigate('/analysis')}
            className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:text-emerald-700 transition-colors"
          >
            View report <ChevronRight size={12} />
          </button>
        </div>

        {/* WhatsApp card */}
        <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <MessageCircle size={22} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Keep coaching in WhatsApp</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Get your daily question delivered every morning. Reply with your answer — no app needed.
            </p>
          </div>
          <button
            onClick={() => navigate('/whatsapp')}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            {whatsapp_connected ? 'Manage' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}
