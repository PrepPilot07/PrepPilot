import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Target,
  Briefcase,
  GraduationCap,
  HeartHandshake,
  Scale,
  MessageSquare,
  FileText,
  ChevronDown,
  Copy,
  Check,
  AlertTriangle,
  Printer,
  CheckCircle2,
  XCircle,
  Award,
} from 'lucide-react';
import { fetchAnalysis, type UploadResult, type RequirementMatch, type GapAssessment } from '../api/upload';
import { useAuth } from '../store/AuthContext';

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

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="url(#ringGrad)" strokeWidth={strokeWidth}
          fill="none" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"
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
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-xs font-bold ${scoreTextColor((score / max) * 100)}`}>{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${scoreGradient((score / max) * 100)}`}
          style={{ width: `${pct}%`, transition: 'width 1s ease' }}
        />
      </div>
    </div>
  );
}

// ── Requirement Match Row (evidence-based fit analysis) ────────────────────────

const STRENGTH_STYLES: Record<string, { bar: string; text: string; label: string }> = {
  strong: { bar: 'bg-emerald-500', text: 'text-emerald-600', label: 'Strong' },
  partial: { bar: 'bg-amber-500', text: 'text-amber-600', label: 'Partial' },
  weak: { bar: 'bg-orange-500', text: 'text-orange-600', label: 'Weak' },
  none: { bar: 'bg-rose-500', text: 'text-rose-600', label: 'No evidence' },
};

function RequirementRow({ match }: { match: RequirementMatch }) {
  const [open, setOpen] = useState(false);
  const style = STRENGTH_STYLES[match.strength] ?? STRENGTH_STYLES.none;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-gray-50 transition-colors text-left"
      >
        <span className={`shrink-0 w-1.5 h-8 rounded-full ${style.bar}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{match.requirement}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
              {match.importance === 'must_have' ? 'Must-have' : 'Nice-to-have'}
            </span>
            <span className="text-gray-300">&middot;</span>
            <span className={`text-[10px] uppercase tracking-wide font-semibold ${style.text}`}>{style.label}</span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-100 space-y-2">
          <p className="text-xs text-gray-600 leading-relaxed">{match.reasoning}</p>
          {match.evidence.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Evidence</p>
              <ul className="space-y-1">
                {match.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <span className="mt-1 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const GAP_SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  hard_blocker: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', label: 'Hard blocker' },
  learnable: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Learnable on the job' },
  partially_covered: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Partially covered' },
};

function GapRow({ gap }: { gap: GapAssessment }) {
  const style = GAP_SEVERITY_STYLES[gap.severity] ?? GAP_SEVERITY_STYLES.learnable;
  return (
    <div className={`p-3 rounded-xl border ${style.bg} ${style.border}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-gray-900">{gap.requirement}</p>
        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/60 ${style.text}`}>
          {style.label}
        </span>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{gap.explanation}</p>
    </div>
  );
}

// ── Compact stat (skill-gap summary strip) ──────────────────────────────────────

function StatChip({ label, count, color }: { label: string; count: number; color: string }) {
  if (count === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${color}`}>
      {count} {label}
    </span>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="font-bold text-gray-900 text-base">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm p-6 ${className}`}>
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
      className="ml-auto shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-emerald-50 border border-transparent hover:border-emerald-200 text-gray-400 hover:text-emerald-700 transition-all"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ── Main Analysis Page ─────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState<UploadResult | undefined>(location.state?.result);
  const [loading, setLoading] = useState(!data);
  const [errorMsg, setErrorMsg] = useState('');

  const [activeTab, setActiveTab] = useState<'technical' | 'behavioral' | 'cultural'>('technical');

  useEffect(() => {
    if (data || !token) return;

    fetchAnalysis(token).then(res => {
      setLoading(false);
      if (res.status === 404) {
        setErrorMsg('No analysis data found. Please upload a resume first.');
      } else if (res.data) {
        setData(res.data);
      } else {
        setErrorMsg(res.error || 'Failed to load analysis.');
      }
    });
  }, [token, data]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading your analysis...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 bg-transparent">
        <p className="text-gray-500 text-sm">{errorMsg || 'No analysis data found. Please upload a resume first.'}</p>
        <button
          onClick={() => navigate('/upload')}
          className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-semibold transition-all"
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

  // Prefer the evidence-based requirement counts; fall back to the flat lists
  // for older cached reports that predate the LangGraph fit-analysis pipeline.
  const strongCount = skills?.requirement_matches?.filter(m => m.strength === 'strong').length ?? skills?.matched.length ?? 0;
  const partialCount = skills?.requirement_matches?.filter(m => m.strength === 'partial').length ?? skills?.partial.length ?? 0;
  const gapCount = skills?.requirement_matches?.filter(m => m.strength === 'weak' || m.strength === 'none').length ?? skills?.missing.length ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-16 text-gray-900">

      {/* ── HERO BAND ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 overflow-hidden relative">
          {/* subtle accent glow */}
          <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-10 ${
            rec === 'Strong Hire' ? 'bg-emerald-500' :
            rec === 'Hire' ? 'bg-green-500' :
            rec === 'Maybe' ? 'bg-amber-500' : 'bg-red-500'
          }`} />

          <button
            onClick={() => window.print()}
            title="Print report"
            className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all"
          >
            <Printer size={16} />
          </button>

          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Score ring */}
            <div className="shrink-0">
              <ScoreRing score={overallScore} size={130} strokeWidth={11} />
              <p className="text-center text-xs text-gray-500 mt-1">Overall Score</p>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Hiring Analysis Report</p>
                <h1 className="text-2xl font-black text-gray-900">{resume.name || 'Candidate'}</h1>
                <p className="text-gray-600 text-sm mt-0.5">
                  Applying for <span className="text-emerald-600 font-semibold">{jd.role_title || 'Unknown Role'}</span>
                </p>
              </div>

              {/* Recommendation badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${recColors.bg} ${recColors.border} ${recColors.text}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${recColors.dot}`} />
                {rec}
              </div>

              {decision?.reasoning && (
                <p className="text-sm text-gray-600 leading-relaxed max-w-xl">
                  {decision.reasoning}
                </p>
              )}
            </div>

            {/* Confidence */}
            {decision?.confidence !== undefined && (
              <div className="shrink-0 text-center">
                <div className="text-3xl font-black text-emerald-500">{decision.confidence}%</div>
                <div className="text-xs text-gray-400">Confidence</div>
              </div>
            )}
          </div>
        </div>

        {/* ── SCORE CARDS ROW ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Skills Match', score: skills?.score ?? 0, icon: <Target size={20} /> },
            { label: 'Experience Fit', score: experience?.score ?? 0, icon: <Briefcase size={20} /> },
            { label: 'Culture Fit', score: culture?.overall_score ?? 0, icon: <HeartHandshake size={20} /> },
            { label: 'Education Fit', score: education?.score ?? 0, icon: <GraduationCap size={20} /> },
          ].map(c => (
            <Card key={c.label} className="text-center !py-5">
              <div className="flex justify-center text-gray-400 mb-2">{c.icon}</div>
              <div className={`text-2xl font-black mb-0.5 ${scoreTextColor(c.score)}`}>{c.score}</div>
              <div className="text-xs text-gray-600">/ 100</div>
              <div className="h-1 mt-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${scoreGradient(c.score)}`}
                  style={{ width: `${c.score}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-2">{c.label}</div>
            </Card>
          ))}
        </div>

        {/* ── SKILL GAP ANALYSIS (evidence-based) ───────────────────────────────── */}
        {skills && (
          <Card>
            <SectionHeader
              icon={<Target size={18} />}
              title="Skill Gap Analysis"
              subtitle="Evidence-based fit against each job requirement — not keyword matching"
            />

            <div className="flex flex-wrap gap-2 mb-4">
              <StatChip label="strong match" count={strongCount} color="bg-emerald-50 text-emerald-700" />
              <StatChip label="partial match" count={partialCount} color="bg-amber-50 text-amber-700" />
              <StatChip label="gaps identified" count={gapCount} color="bg-rose-50 text-rose-700" />
            </div>

            {skills.reasoning && (
              <p className="text-sm text-gray-600 leading-relaxed mb-5">{skills.reasoning}</p>
            )}

            {skills.requirement_matches && skills.requirement_matches.length > 0 ? (
              <>
                <div className="space-y-2">
                  {skills.requirement_matches.map((m, i) => (
                    <RequirementRow key={i} match={m} />
                  ))}
                </div>

                {skills.gaps && skills.gaps.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                      Gap Impact Assessment
                    </p>
                    <div className="space-y-2">
                      {skills.gaps.map((g, i) => (
                        <GapRow key={i} gap={g} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Fallback for older cached reports predating the evidence-based pipeline.
              <div className="flex flex-wrap gap-1.5">
                {skills.matched.map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">{s}</span>
                ))}
                {skills.partial.map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">{s}</span>
                ))}
                {skills.missing.map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">{s}</span>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ── TWO COLUMN LAYOUT ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* EXPERIENCE ASSESSMENT */}
          {experience && (
            <Card>
              <SectionHeader icon={<Scale size={18} />} title="Experience Assessment" />
              {experience.reasoning && (
                <p className="text-sm text-gray-600 leading-relaxed">{experience.reasoning}</p>
              )}
            </Card>
          )}

          {/* CULTURE FIT */}
          {culture && (
            <Card>
              <SectionHeader icon={<HeartHandshake size={18} />} title="Culture Fit" subtitle={`Overall: ${culture.overall_score}/100`} />
              <div className="space-y-4 mb-4">
                <ScoreBar label="Communication" score={culture.communication} max={10} />
                <ScoreBar label="Leadership" score={culture.leadership} max={10} />
                <ScoreBar label="Ownership" score={culture.ownership} max={10} />
                <ScoreBar label="Problem Solving" score={culture.problem_solving} max={10} />
                <ScoreBar label="Adaptability" score={culture.adaptability} max={10} />
              </div>
              {culture.reasoning && (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-600 leading-relaxed">{culture.reasoning}</p>
                </div>
              )}
              {culture.uncertainty_notes && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">{culture.uncertainty_notes}</p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* ── EXPERIENCE TIMELINE ───────────────────────────────────────────────── */}
        {resume.experience?.length > 0 && (
          <Card>
            <SectionHeader icon={<Briefcase size={18} />} title="Experience Timeline" subtitle={`${resume.experience.length} position${resume.experience.length > 1 ? 's' : ''}`} />
            <div className="relative">
              <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gray-200" />
              <div className="space-y-6 pl-10">
                {resume.experience.map((exp, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[34px] top-0.5 w-4 h-4 rounded-full border-2 border-white bg-gray-300" />
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-1">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{exp.role}</p>
                        <p className="text-gray-500 text-xs">{exp.company}</p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                        {exp.duration}
                      </span>
                    </div>
                    {exp.responsibilities?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {exp.responsibilities.slice(0, 3).map((r, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-gray-500">
                            <span className="mt-1 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}
                    {exp.achievements?.length > 0 && (
                      <ul className="mt-1 space-y-1">
                        {exp.achievements.slice(0, 2).map((a, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-emerald-700">
                            <Award size={12} className="text-emerald-500 shrink-0 mt-0.5" />
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
            <SectionHeader icon={<GraduationCap size={18} />} title="Education"
              subtitle={education ? `${education.meets_requirement ? 'Meets' : 'Does not meet'} JD requirement` : undefined} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {resume.education.map((edu, i) => (
                  <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm">{edu.degree}</p>
                    <p className="text-xs text-gray-500">{edu.branch}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{edu.institution} · {edu.year}</p>
                    {edu.gpa && <p className="text-xs text-gray-500 mt-0.5">GPA: {edu.gpa}</p>}
                  </div>
                ))}
                {resume.certifications?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Certifications</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resume.certifications.map(c => (
                        <span key={c} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {education?.reasoning && (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Assessment</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{education.reasoning}</p>
                  <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${
                    education.meets_requirement
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                    {education.meets_requirement ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {education.meets_requirement ? 'Meets Requirement' : 'Does Not Meet Requirement'}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── INTERVIEW QUESTIONS ───────────────────────────────────────────────── */}
        {(techQuestions.length > 0 || behavQuestions.length > 0 || cultQuestions.length > 0) && (
          <Card>
            <SectionHeader icon={<MessageSquare size={18} />} title="Interview Questions" subtitle="Tailored to this candidate & role" />
            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 bg-gray-100 rounded-xl">
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
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
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
                <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-emerald-300 transition-colors group">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed flex-1">{q}</p>
                  <CopyBtn text={q} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── EXECUTIVE SUMMARY ─────────────────────────────────────────────────── */}
        {narrative_summary && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
            <SectionHeader icon={<FileText size={18} />} title="Executive Summary" subtitle="AI-generated narrative for the hiring committee" />
            <blockquote className="text-gray-700 text-sm leading-loose italic border-l-2 border-emerald-500/40 pl-4">
              {narrative_summary}
            </blockquote>
          </div>
        )}

        {/* ── PROS / CONS / RISKS ───────────────────────────────────────────────── */}
        {decision && (decision.pros?.length > 0 || decision.cons?.length > 0 || decision.risks?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {decision.pros?.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">Pros</p>
                </div>
                <ul className="space-y-2">
                  {decision.pros.map((p, i) => (
                    <li key={i} className="text-sm text-gray-700">{p}</li>
                  ))}
                </ul>
              </Card>
            )}
            {decision.cons?.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <XCircle size={15} className="text-rose-500" />
                  <p className="text-xs font-semibold text-rose-500 uppercase tracking-widest">Cons</p>
                </div>
                <ul className="space-y-2">
                  {decision.cons.map((c, i) => (
                    <li key={i} className="text-sm text-gray-700">{c}</li>
                  ))}
                </ul>
              </Card>
            )}
            {decision.risks?.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className="text-amber-500" />
                  <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest">Risks</p>
                </div>
                <ul className="space-y-2">
                  {decision.risks.map((r, i) => (
                    <li key={i} className="text-sm text-gray-700">{r}</li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {/* ── FOOTER CTA ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate('/upload')}
            className="flex-1 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300 text-sm font-semibold transition-all shadow-sm"
          >
            ← Analyse Another Resume
          </button>
          <button
            onClick={() => navigate('/roadmap')}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 hover:brightness-110 transition-all"
          >
            View Your Roadmap →
          </button>
        </div>
      </div>
  );
}
