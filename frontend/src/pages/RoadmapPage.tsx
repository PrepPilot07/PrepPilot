import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import {
  fetchRoadmap,
  generateRoadmap,
  RoadmapDay,
  RoadmapResponse,
  CompleteDayResult,
} from '../api/roadmap';
import { ChevronRight, RefreshCw, Upload, Check, Lock, Sparkles, Loader2, CalendarDays, AlertTriangle } from 'lucide-react';
import PracticeModal from '../components/PracticeModal';

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
      <div className="flex gap-4">
        <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="w-20 h-7 bg-gray-200 rounded-full shrink-0 self-center" />
      </div>
    </div>
  );
}

// ── Difficulty badge ──────────────────────────────────────────────────────────

function DifficultyDot({ difficulty }: { difficulty: RoadmapDay['difficulty'] }) {
  const colors = {
    easy: 'bg-emerald-400',
    medium: 'bg-amber-400',
    hard: 'bg-rose-400',
  };
  const color = difficulty ? colors[difficulty] : 'bg-gray-300';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

// ── Day card ──────────────────────────────────────────────────────────────────

function DayCard({
  day,
  index,
  isNext,
  totalDays,
  onPractice,
}: {
  day: RoadmapDay;
  index: number;
  isNext: boolean;
  totalDays: number;
  onPractice: (day: RoadmapDay) => void;
}) {
  const isLast = index === totalDays - 1;
  const isToday = day.status === 'today';
  const isCompleted = day.status === 'completed';

  return (
    <div className="flex gap-4">
      {/* Timeline column */}
      <div className="flex flex-col items-center w-10 shrink-0">
        {/* Circle marker */}
        {isCompleted ? (
          <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center z-10">
            <Check size={16} className="text-white" strokeWidth={3} />
          </div>
        ) : isToday ? (
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-200 z-10">
            <div className="w-3 h-3 rounded-full bg-white" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center z-10">
            <span className="text-xs font-semibold text-gray-400">{day.day_number}</span>
          </div>
        )}
        {/* Dotted connector line */}
        {!isLast && (
          <div
            className="flex-1 w-px mt-1"
            style={{
              background: 'repeating-linear-gradient(to bottom, #d1d5db 0px, #d1d5db 4px, transparent 4px, transparent 10px)',
            }}
          />
        )}
      </div>

      {/* Card */}
      <div
        onClick={isCompleted ? () => onPractice(day) : undefined}
        role={isCompleted ? 'button' : undefined}
        tabIndex={isCompleted ? 0 : undefined}
        onKeyDown={
          isCompleted
            ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPractice(day);
              }
            }
            : undefined
        }
        className={`flex-1 rounded-2xl border p-5 mb-4 transition-shadow hover:shadow-sm ${isCompleted
            ? 'border-gray-100 bg-gray-50/70 cursor-pointer hover:border-emerald-200'
            : isToday
              ? 'border-emerald-200 bg-white shadow-sm'
              : 'border-gray-200 bg-white'
          }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Day label */}
            <div className="flex items-center gap-2 mb-1.5">
              <DifficultyDot difficulty={day.difficulty} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Day {day.day_number}
                {isToday && <span className="text-emerald-600 ml-1">· Today</span>}
                {isCompleted && <span className="text-emerald-500 ml-1">· Done</span>}
              </span>
            </div>

            {/* Topic title */}
            <h3
              className={`font-semibold text-[15px] leading-snug mb-1 ${isCompleted ? 'text-gray-500' : 'text-gray-900'
                }`}
            >
              {day.topic}
            </h3>

            {/* Learning goal */}
            {day.learning_goal && (
              <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                {day.learning_goal}
              </p>
            )}

            {/* Focus skill pill */}
            {day.focus_skill && (
              <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                {day.focus_skill}
              </span>
            )}
          </div>

          {/* Status / CTA */}
          <div className="shrink-0 self-center ml-2">
            {isCompleted ? (
              <div className="flex flex-col items-end gap-1.5">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">
                  <Check size={13} strokeWidth={3} />
                  Completed
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPractice(day);
                  }}
                  className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Revisit
                  <ChevronRight size={13} />
                </button>
              </div>
            ) : isToday ? (
              <button
                onClick={() => onPractice(day)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-emerald-200"
              >
                Practice Here
                <ChevronRight size={14} />
              </button>
            ) : isNext ? (
              <span className="inline-flex items-center px-3 py-1.5 bg-violet-100 text-violet-600 text-xs font-semibold rounded-full">
                Up next
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-medium rounded-full">
                <Lock size={11} />
                Locked
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Progress card ─────────────────────────────────────────────────────────────

function ProgressCard({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
        {total}-Day Sprint



      </p>
      <p className="text-2xl font-black text-gray-900 mb-3">
        <span className="text-emerald-600">{completed}</span>
        <span className="text-gray-300 font-medium"> / {total}</span>
        <span className="text-base font-semibold text-gray-500 ml-1">complete</span>
      </p>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── What we found card ────────────────────────────────────────────────────────

function WhatWeFoundCard({
  roadmap,
}: {
  roadmap: RoadmapResponse;
}) {
  const navigate = useNavigate();
  // Derive a short insight from the days (first day topic = biggest gap)
  const topicDay = roadmap.days[0];
  const insight = topicDay
    ? `Biggest gap: ${topicDay.focus_skill || topicDay.topic}`
    : 'Analysis complete';

  const description = roadmap.days[1]
    ? `Also focusing on ${roadmap.days[1]?.focus_skill || roadmap.days[1]?.topic} and ${roadmap.days[2]?.focus_skill || 'more'}.`
    : 'Your personalised plan is ready.';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
      {/* Avatar */}
      <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-sm">AI</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
          What We Found
        </p>
        <p className="font-semibold text-gray-900 text-sm truncate">{insight}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{description}</p>
      </div>

      <button
        onClick={() => navigate('/upload')}
        className="shrink-0 text-xs font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap flex items-center gap-1 transition-colors"
      >
        Edit inputs →
      </button>
    </div>
  );
}

// ── Generate roadmap form ─────────────────────────────────────────────────────

function GenerateRoadmapForm({
  onGenerated,
  compact = false,
  defaultDays = 15,
}: {
  onGenerated: (roadmap: RoadmapResponse) => void;
  compact?: boolean;
  defaultDays?: number;
}) {
  const { token } = useAuth();
  const [days, setDays] = useState<number>(defaultDays);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!token || generating) return;
    if (!Number.isInteger(days) || days < 1 || days > 60) {
      setError('Enter a number of days between 1 and 60.');
      return;
    }
    setGenerating(true);
    setError(null);
    const res = await generateRoadmap(token, days);
    setGenerating(false);
    if (res.error || !res.data) {
      setError(res.error ?? "Couldn't generate your roadmap, please try again.");
      return;
    }
    onGenerated(res.data);
  };

  return (
    <div className={compact ? 'w-full' : 'w-full max-w-sm'}>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-left">
        Days until your interview
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <CalendarDays
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="number"
            min={1}
            max={60}
            value={Number.isNaN(days) ? '' : days}
            onChange={(e) => setDays(Math.floor(e.target.valueAsNumber))}
            disabled={generating}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 disabled:opacity-60"
          />
        </div>
        <button
          onClick={submit}
          disabled={generating}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-emerald-200 whitespace-nowrap"
        >
          {generating ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles size={15} />
              Generate My Roadmap
            </>
          )}
        </button>
      </div>
      {generating && (
        <p className="mt-2 text-xs text-gray-400 text-left">
          Building your plan with AI — this can take a few seconds.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-rose-600 text-left">{error}</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [practiceDay, setPracticeDay] = useState<RoadmapDay | null>(null);
  const [showRegen, setShowRegen] = useState(false);

  // Drop a freshly generated roadmap straight into state (also clears empty/error).
  const handleGenerated = (generated: RoadmapResponse) => {
    setNotFound(false);
    setError(null);
    setRoadmap(generated);
    setShowRegen(false);
  };

  const loadRoadmap = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);

    const result = await fetchRoadmap(token);
    setLoading(false);

    if (result.status === 404) {
      setNotFound(true);
    } else if (result.error || !result.data) {
      setError(result.error ?? 'Unknown error');
    } else {
      setRoadmap(result.data);
    }
  };

  useEffect(() => {
    loadRoadmap();
  }, [token]);

  // Apply a completion result to local state so the completed day + newly
  // unlocked day re-render immediately (no full refetch, no page reload).
  const handleCompleted = (result: CompleteDayResult) => {
    setRoadmap((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d) => {
        if (d.id === result.day.id) {
          return { ...d, status: result.day.status, completed_at: result.day.completed_at };
        }
        if (result.next_day && d.id === result.next_day.id) {
          return { ...d, status: result.next_day.status };
        }
        return d;
      });
      return { ...prev, days, completed_count: result.completed_count };
    });
  };

  // Derive role title from first day's focus for fallback
  const roleTitle = null; // Would come from stored JD; using null triggers fallback

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-4">
        {/* Header skeleton */}
        <div className="mb-8 space-y-2 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-32 mb-4" />
          <div className="h-9 bg-gray-200 rounded w-3/4" />
          <div className="h-9 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-64 mt-2" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // ── Not found / empty state ─────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 flex flex-col items-center text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Sparkles size={28} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Build your roadmap</h2>
          <p className="text-gray-500 max-w-sm">
            Tell us how many days you have until your interview and we'll generate a
            focused, day-by-day prep plan for you.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <GenerateRoadmapForm onGenerated={handleGenerated} />
        </div>

        <button
          onClick={() => navigate('/upload')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors"
        >
          <Upload size={14} />
          Or upload a resume & JD instead
        </button>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────

  if (error || !roadmap) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 flex flex-col items-center text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
          <RefreshCw size={28} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm max-w-sm">{error ?? 'Failed to load your roadmap.'}</p>
        </div>
        <button
          onClick={loadRoadmap}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    );
  }

  // ── Loaded state ────────────────────────────────────────────────────────────

  const { days } = roadmap;
  const totalDays = days.length;
  // Progress driven by actual per-day status, not a static count.
  const completedCount = days.filter((d) => d.status === 'completed').length;
  // The "Up next" pill is the locked day immediately after the active day.
  const todayDay = days.find((d) => d.status === 'today');
  const nextDayNumber = todayDay ? todayDay.day_number + 1 : null;

  // Derive role title for headline (fallback copy)
  const headlineRole = roleTitle ?? 'the role you want next';
  const subtitleRole = roleTitle ?? 'your target role';

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* ── Header section ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Your Personalized Path
          </p>
          <h1 className="font-fraunces text-4xl font-semibold text-gray-900 leading-[1.15] mb-3">
            Built around<br />
            {headlineRole}.
          </h1>
          <p className="text-gray-500 text-[15px]">
            A focused {totalDays}-day sprint for a {subtitleRole} interview.
          </p>
        </div>

        {/* Progress card — top right */}
        <div className="w-52 shrink-0">
          <ProgressCard completed={completedCount} total={totalDays} />
          <button
            onClick={() => setShowRegen((v) => !v)}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <RefreshCw size={12} />
            {showRegen ? 'Cancel' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* ── Stale plan notice ──────────────────────────────────────────────── */}
      {/* This plan predates the analysis on file — it was built from an older
          resume/JD. Previously it rendered as though it were current. */}
      {roadmap.is_stale && !showRegen && (
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              This plan is from an earlier analysis
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              You've run a newer resume &amp; JD analysis since this roadmap was built, so
              these topics may not match your current skill gaps.
            </p>
          </div>
          <button
            onClick={() => setShowRegen(true)}
            className="shrink-0 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            Rebuild
          </button>
        </div>
      )}

      {/* ── Regenerate panel ───────────────────────────────────────────────── */}
      {showRegen && (
        <div className="mb-8 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
            Regenerate roadmap
          </p>
          <p className="text-xs text-gray-500 mb-3">
            This replaces your current plan — completed progress will reset.
          </p>
          <GenerateRoadmapForm compact defaultDays={totalDays} onGenerated={handleGenerated} />
        </div>
      )}

      {/* ── What we found ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <WhatWeFoundCard roadmap={roadmap} />
      </div>

      {/* ── Timeline ───────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Your {totalDays}-Day Plan</h2>
        <div className="relative">
          {days.map((day, i) => (
            <DayCard
              key={day.id || day.day_number}
              day={day}
              index={i}
              isNext={day.status === 'locked' && day.day_number === nextDayNumber}
              totalDays={totalDays}
              onPractice={setPracticeDay}
            />
          ))}
        </div>
      </div>

      {/* ── Bottom spacer ──────────────────────────────────────────────────── */}
      <div className="h-10" />

      {/* ── Practice / revisit modal ───────────────────────────────────────── */}
      {practiceDay && (
        <PracticeModal
          dayId={practiceDay.id}
          dayNumber={practiceDay.day_number}
          topic={practiceDay.topic}
          completed={practiceDay.status === 'completed'}
          onClose={() => setPracticeDay(null)}
          onCompleted={handleCompleted}
        />
      )}
    </div>
  );
}
