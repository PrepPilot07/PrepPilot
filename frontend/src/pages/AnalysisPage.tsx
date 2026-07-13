import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { UploadResult } from '../api/upload';

// ── Helpers ────────────────────────────────────────────────────────────────────

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

function recommendationColor(rec: string) {
  switch (rec) {
    case 'Strong Hire': return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-400' };
    case 'Hire':        return { bg: 'bg-green-500/15',   border: 'border-green-500/40',   text: 'text-green-400',   dot: 'bg-green-400' };
    case 'Maybe':       return { bg: 'bg-amber-500/15',   border: 'border-amber-500/40',   text: 'text-amber-400',   dot: 'bg-amber-400' };
    case 'Reject':      return { bg: 'bg-red-500/15',     border: 'border-red-500/40',     text: 'text-red-400',     dot: 'bg-red-400' };
    default:            return { bg: 'bg-gray-700/30',    border: 'border-gray-600/40',    text: 'text-gray-400',    dot: 'bg-gray-400' };
  }
}

function scoreGradient(score: number) {
  if (score >= 80) return 'from-emerald-500 to-green-400';
  if (score >= 65) return 'from-green-500 to-teal-400';
  if (score >= 45) return 'from-amber-500 to-yellow-400';
  return 'from-red-500 to-rose-400';
}

function scoreTextColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 65) return 'text-green-400';
  if (score >= 45) return 'text-amber-400';
  return 'text-red-400';
}

// ── Score Ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 120, strokeWidth = 10 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamp(score) / 100) * circ;
  const grad = scoreGradient(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="url(#ringGrad)" strokeWidth={strokeWidth}
          fill="none" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" className={`stop-color-${grad.split(' ')[0].replace('from-', '')}`}
              style={{ stopColor: score >= 80 ? '#10b981' : score >= 65 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444' }} />
            <stop offset="100%"
              style={{ stopColor: score >= 80 ? '#4ade80' : score >= 65 ? '#2dd4bf' : score >= 45 ? '#facc15' : '#fb7185' }} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className={`text-2xl font-black ${scoreTextColor(score)}`}>{score}</p>
        <p className="text-xs text-gray-600 -mt-0.5">/ 100</p>
      </div>
    </div>
  );
}

// ── Mini Bar ───────────────────────────────────────────────────────────────────

function ScoreBar({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const pct = (clamp(score, 0, max) / max) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`text-xs font-bold ${scoreTextColor((score / max) * 100)}`}>{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${scoreGradient((score / max) * 100)}`}
          style={{ width: `${pct}%`, transition: 'width 1s ease' }}
        />
      </div>
    </div>
  );
}

// ── Pill ───────────────────────────────────────────────────────────────────────

function Pill({ label, variant }: { label: string; variant: 'matched' | 'missing' | 'partial' }) {
  const styles = {
    matched: 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300',
    missing: 'bg-red-900/30 border-red-700/40 text-red-300',
    partial: 'bg-amber-900/25 border-amber-700/35 text-amber-300',
  };
  const icons = { matched: '✓', missing: '✕', partial: '~' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium ${styles[variant]}`}>
      <span className="font-bold text-xs">{icons[variant]}</span>
      {label}
    </span>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-violet-900/30 border border-violet-800/40 flex items-center justify-center text-lg">
        {icon}
      </div>
      <div>
        <h2 className="font-bold text-white text-base">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

// ── Copy Button ────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="ml-auto shrink-0 text-xs px-2 py-0.5 rounded-md bg-white/5 hover:bg-violet-800/30
        border border-white/10 hover:border-violet-600/40 text-gray-500 hover:text-violet-300 transition-all"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// ── Main Analysis Page ─────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state?.result as UploadResult | undefined;

  const [activeTab, setActiveTab] = useState<'technical' | 'behavioral' | 'cultural'>('technical');
  const [reportExpanded, setReportExpanded] = useState(false);

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-950">
        <p className="text-gray-400 text-sm">No analysis data found. Please upload a resume first.</p>
        <button
          onClick={() => navigate('/upload')}
          className="px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-sm transition-colors"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  const { resume, jd, skills, experience, education, culture, decision, interview_questions, narrative_summary, weighted_score } = data;

  const rec = decision?.recommendation || 'Maybe';
  const recColors = recommendationColor(rec);
  const overallScore = weighted_score ?? decision?.overall_score ?? 0;

  const iq = interview_questions;
  const techQuestions = iq?.technical ?? iq?.questions ?? [];
  const behavQuestions = iq?.behavioral ?? [];
  const cultQuestions = iq?.cultural ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Gradient background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-900/15 rounded-full blur-3xl" />
      </div>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 border-b border-white/[0.06] bg-gray-950/80 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Upload
            </button>
            <span className="text-gray-700">/</span>
            <span className="text-sm text-white font-medium">Hiring Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="font-bold text-white text-sm tracking-tight">PrepPilot</span>
          </div>
        </div>
      </nav>

      <main className="relative max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* ── HERO BAND ────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-sm p-8 overflow-hidden relative">
          {/* decorative glow */}
          <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-20 ${
            rec === 'Strong Hire' ? 'bg-emerald-500' :
            rec === 'Hire' ? 'bg-green-500' :
            rec === 'Maybe' ? 'bg-amber-500' : 'bg-red-500'
          }`} />

          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Score ring */}
            <div className="shrink-0">
              <ScoreRing score={overallScore} size={130} strokeWidth={11} />
              <p className="text-center text-xs text-gray-600 mt-1">Overall Score</p>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Hiring Analysis Report</p>
                <h1 className="text-2xl font-black text-white">{resume.name || 'Candidate'}</h1>
                <p className="text-gray-400 text-sm mt-0.5">
                  Applying for <span className="text-violet-300 font-semibold">{jd.role_title || 'Unknown Role'}</span>
                </p>
              </div>

              {/* Recommendation badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${recColors.bg} ${recColors.border} ${recColors.text}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${recColors.dot}`} />
                {rec}
              </div>

              {decision?.reasoning && (
                <p className="text-sm text-gray-400 leading-relaxed max-w-xl">
                  {decision.reasoning}
                </p>
              )}
            </div>

            {/* Confidence */}
            {decision?.confidence !== undefined && (
              <div className="shrink-0 text-center">
                <div className="text-3xl font-black text-violet-400">{decision.confidence}%</div>
                <div className="text-xs text-gray-600">Confidence</div>
              </div>
            )}
          </div>
        </div>

        {/* ── SCORE CARDS ROW ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Skills Match', score: skills?.score ?? 0, icon: '🎯' },
            { label: 'Experience Fit', score: experience?.score ?? 0, icon: '💼' },
            { label: 'Culture Fit', score: culture?.overall_score ?? 0, icon: '🤝' },
            { label: 'Education Fit', score: education?.score ?? 0, icon: '🎓' },
          ].map(c => (
            <Card key={c.label} className="text-center !py-5">
              <div className="text-2xl mb-2">{c.icon}</div>
              <div className={`text-2xl font-black mb-0.5 ${scoreTextColor(c.score)}`}>{c.score}</div>
              <div className="text-xs text-gray-600">/ 100</div>
              <div className="h-1 mt-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${scoreGradient(c.score)}`}
                  style={{ width: `${c.score}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-2">{c.label}</div>
            </Card>
          ))}
        </div>

        {/* ── TWO COLUMN LAYOUT ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* SKILLS DEEP DIVE */}
          {skills && (
            <Card>
              <SectionHeader icon="🎯" title="Skills Deep-Dive" subtitle={`${skills.matched.length} matched · ${skills.missing.length} missing · ${skills.partial.length} partial`} />

              {skills.matched.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-2">Matched</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.matched.map(s => <Pill key={s} label={s} variant="matched" />)}
                  </div>
                </div>
              )}

              {skills.missing.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-2">Missing</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.missing.map(s => <Pill key={s} label={s} variant="missing" />)}
                  </div>
                </div>
              )}

              {skills.partial.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-2">Partial Match</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.partial.map(s => <Pill key={s} label={s} variant="partial" />)}
                  </div>
                </div>
              )}

              {skills.reasoning && (
                <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-xs text-gray-400 leading-relaxed">{skills.reasoning}</p>
                </div>
              )}
            </Card>
          )}

          {/* STRENGTHS & WEAKNESSES */}
          {experience && (
            <Card>
              <SectionHeader icon="⚖️" title="Strengths & Weaknesses" subtitle={`Seniority: ${experience.seniority_fit?.replace('-', ' ')}`} />

              {experience.strengths?.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-3">Strengths</p>
                  <ul className="space-y-2">
                    {experience.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-900/30 border border-emerald-700/40 flex items-center justify-center shrink-0">
                          <span className="text-emerald-400 text-xs">✓</span>
                        </span>
                        <span className="text-sm text-gray-300">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {experience.weaknesses?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-3">Weaknesses</p>
                  <ul className="space-y-2">
                    {experience.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-red-900/30 border border-red-700/40 flex items-center justify-center shrink-0">
                          <span className="text-red-400 text-xs">✕</span>
                        </span>
                        <span className="text-sm text-gray-300">{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {experience.reasoning && (
                <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-xs text-gray-400 leading-relaxed">{experience.reasoning}</p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* ── CULTURE FIT ──────────────────────────────────────────────────────── */}
        {culture && (
          <Card>
            <SectionHeader icon="🤝" title="Culture Fit Analysis" subtitle={`Overall: ${culture.overall_score}/100`} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <ScoreBar label="Communication" score={culture.communication} max={10} />
                <ScoreBar label="Leadership" score={culture.leadership} max={10} />
                <ScoreBar label="Ownership" score={culture.ownership} max={10} />
                <ScoreBar label="Problem Solving" score={culture.problem_solving} max={10} />
                <ScoreBar label="Adaptability" score={culture.adaptability} max={10} />
              </div>
              <div className="space-y-4">
                {culture.reasoning && (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">Assessment</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{culture.reasoning}</p>
                  </div>
                )}
                {culture.uncertainty_notes && (
                  <div className="p-4 rounded-xl bg-amber-900/10 border border-amber-800/30">
                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-2">⚠ Uncertainty</p>
                    <p className="text-xs text-amber-300/70 leading-relaxed">{culture.uncertainty_notes}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* ── EXPERIENCE TIMELINE ───────────────────────────────────────────────── */}
        {resume.experience?.length > 0 && (
          <Card>
            <SectionHeader icon="💼" title="Experience Timeline" subtitle={`${resume.experience.length} position${resume.experience.length > 1 ? 's' : ''}`} />
            <div className="relative">
              <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gradient-to-b from-violet-500/40 via-indigo-500/20 to-transparent" />
              <div className="space-y-6 pl-10">
                {resume.experience.map((exp, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[34px] top-0.5 w-4 h-4 rounded-full border-2 border-violet-500/60 bg-violet-900/40" />
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-1">
                      <div>
                        <p className="font-semibold text-white text-sm">{exp.role}</p>
                        <p className="text-violet-300/80 text-xs">{exp.company}</p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-600 bg-white/5 px-2.5 py-1 rounded-lg border border-white/[0.06]">
                        {exp.duration}
                      </span>
                    </div>
                    {exp.responsibilities?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {exp.responsibilities.slice(0, 3).map((r, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-gray-500">
                            <span className="mt-1 w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}
                    {exp.achievements?.length > 0 && (
                      <ul className="mt-1 space-y-1">
                        {exp.achievements.slice(0, 2).map((a, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-emerald-400/70">
                            <span className="mt-0.5 text-emerald-500">🏆</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ── EDUCATION ─────────────────────────────────────────────────────────── */}
        {(resume.education?.length > 0 || education) && (
          <Card>
            <SectionHeader icon="🎓" title="Education"
              subtitle={education ? `${education.meets_requirement ? 'Meets' : 'Does not meet'} JD requirement` : undefined} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {resume.education.map((edu, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="font-semibold text-white text-sm">{edu.degree}</p>
                    <p className="text-xs text-violet-300/80">{edu.branch}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{edu.institution} · {edu.year}</p>
                    {edu.gpa && <p className="text-xs text-gray-600 mt-0.5">GPA: {edu.gpa}</p>}
                  </div>
                ))}
                {resume.certifications?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Certifications</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resume.certifications.map(c => (
                        <span key={c} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-900/25 border border-indigo-800/35 text-indigo-300">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {education?.reasoning && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Assessment</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{education.reasoning}</p>
                  <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${
                    education.meets_requirement
                      ? 'bg-emerald-900/20 border-emerald-700/40 text-emerald-400'
                      : 'bg-red-900/20 border-red-700/40 text-red-400'
                  }`}>
                    {education.meets_requirement ? '✓ Meets Requirement' : '✕ Does Not Meet Requirement'}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── INTERVIEW QUESTIONS ───────────────────────────────────────────────── */}
        {(techQuestions.length > 0 || behavQuestions.length > 0 || cultQuestions.length > 0) && (
          <Card>
            <SectionHeader icon="💬" title="Interview Questions" subtitle="Tailored to this candidate & role" />
            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 bg-white/[0.04] rounded-xl">
              {([
                { key: 'technical', label: `Technical (${techQuestions.length})` },
                { key: 'behavioral', label: `Behavioural (${behavQuestions.length})` },
                { key: 'cultural', label: `Cultural (${cultQuestions.length})` },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'bg-violet-700 text-white shadow-lg'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {(activeTab === 'technical' ? techQuestions :
                activeTab === 'behavioral' ? behavQuestions : cultQuestions
              ).map((q, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-violet-800/40 transition-colors group">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-violet-900/30 border border-violet-800/40 flex items-center justify-center text-violet-400 text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-300 leading-relaxed flex-1">{q}</p>
                  <CopyBtn text={q} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── NARRATIVE SUMMARY ─────────────────────────────────────────────────── */}
        {narrative_summary && (
          <div className="rounded-2xl border border-violet-800/30 bg-gradient-to-br from-violet-900/20 to-indigo-900/10 p-6">
            <SectionHeader icon="📝" title="Executive Summary" subtitle="AI-generated narrative for the hiring committee" />
            <blockquote className="text-gray-300 text-sm leading-loose italic border-l-2 border-violet-500/40 pl-4">
              {narrative_summary}
            </blockquote>
          </div>
        )}

        {/* ── PROS / CONS / RISKS ───────────────────────────────────────────────── */}
        {decision && (decision.pros?.length > 0 || decision.cons?.length > 0 || decision.risks?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {decision.pros?.length > 0 && (
              <Card>
                <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-3">✓ Pros</p>
                <ul className="space-y-2">
                  {decision.pros.map((p, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">+</span>{p}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {decision.cons?.length > 0 && (
              <Card>
                <p className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-3">✕ Cons</p>
                <ul className="space-y-2">
                  {decision.cons.map((c, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">−</span>{c}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {decision.risks?.length > 0 && (
              <Card>
                <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-3">⚠ Risks</p>
                <ul className="space-y-2">
                  {decision.risks.map((r, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">!</span>{r}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {/* ── FINAL RECRUITER REPORT ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <button
            onClick={() => setReportExpanded(!reportExpanded)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">📋</span>
              <div className="text-left">
                <p className="font-bold text-white text-sm">Final Recruiter Report</p>
                <p className="text-xs text-gray-600">Full structured evaluation — print-ready</p>
              </div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round"
              className={`w-4 h-4 text-gray-500 transition-transform ${reportExpanded ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {reportExpanded && (
            <div className="px-6 pb-6 border-t border-white/[0.05] pt-6 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-gray-600">Candidate</span><p className="text-white font-semibold">{resume.name}</p></div>
                <div><span className="text-gray-600">Role</span><p className="text-white font-semibold">{jd.role_title}</p></div>
                <div><span className="text-gray-600">Recommendation</span><p className={`font-bold ${recColors.text}`}>{rec}</p></div>
                <div><span className="text-gray-600">Overall Score</span><p className={`font-bold ${scoreTextColor(overallScore)}`}>{overallScore}/100</p></div>
              </div>

              <hr className="border-white/[0.05]" />

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Score Breakdown</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { l: 'Skills (40%)', s: skills?.score ?? 0 },
                    { l: 'Experience (30%)', s: experience?.score ?? 0 },
                    { l: 'Culture (20%)', s: culture?.overall_score ?? 0 },
                    { l: 'Education (10%)', s: education?.score ?? 0 },
                  ].map(item => (
                    <div key={item.l} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <p className={`text-lg font-black ${scoreTextColor(item.s)}`}>{item.s}</p>
                      <p className="text-xs text-gray-600">{item.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {narrative_summary && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Executive Summary</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{narrative_summary}</p>
                </div>
              )}

              {decision?.reasoning && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Decision Reasoning</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{decision.reasoning}</p>
                </div>
              )}

              {skills?.reasoning && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Skills Assessment</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{skills.reasoning}</p>
                </div>
              )}

              {experience?.reasoning && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Experience Assessment</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{experience.reasoning}</p>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-700/20 hover:bg-violet-700/40 border border-violet-600/30 text-violet-300 text-sm font-semibold transition-all"
                >
                  🖨️ Print Report
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER CTA ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate('/upload')}
            className="flex-1 py-3.5 rounded-2xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-semibold transition-all"
          >
            ← Analyse Another Resume
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-violet-900/30 hover:brightness-110 transition-all"
          >
            Go to Dashboard →
          </button>
        </div>

      </main>

      <footer className="border-t border-white/[0.05] py-4 text-center text-xs text-gray-700 mt-6">
        PrepPilot · AI interview coaching · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
