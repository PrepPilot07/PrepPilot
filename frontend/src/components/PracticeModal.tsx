import { useEffect, useMemo, useState } from 'react';
import {
  X,
  ExternalLink,
  BookOpen,
  ListChecks,
  Check,
  Loader2,
  PencilLine,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import {
  fetchPractice,
  fetchDayAnswers,
  submitAnswer,
  completeDay,
  PracticeContent,
  PracticeQuestion,
  PracticeAnswer,
  CompleteDayResult,
} from '../api/roadmap';

interface PracticeModalProps {
  dayId: string;
  dayNumber: number;
  topic: string;
  // When true, the day is already completed — content is shown for revisiting,
  // with no "Mark as complete" action.
  completed?: boolean;
  onClose: () => void;
  onCompleted: (result: CompleteDayResult) => void;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-600',
  medium: 'bg-amber-50 text-amber-600',
  hard: 'bg-rose-50 text-rose-600',
};

export default function PracticeModal({
  dayId,
  dayNumber,
  topic,
  completed = false,
  onClose,
  onCompleted,
}: PracticeModalProps) {
  const { token } = useAuth();
  const [content, setContent] = useState<PracticeContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [answers, setAnswers] = useState<PracticeAnswer[]>([]);

  // Latest submitted answer per practice question (answers arrive newest-first).
  const latestAnswerByQuestion = useMemo(() => {
    const map: Record<string, PracticeAnswer> = {};
    for (const a of answers) {
      if (!map[a.question_id]) map[a.question_id] = a;
    }
    return map;
  }, [answers]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      const result = await fetchPractice(token, dayId);
      if (!active) return;
      setLoading(false);
      if (result.error || !result.data) {
        setError(result.error ?? 'Failed to load practice content');
      } else {
        setContent(result.data);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, dayId]);

  // Prefill any previously submitted answers/scores for this day.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) return;
      const result = await fetchDayAnswers(token, dayId);
      if (!active) return;
      if (result.data) setAnswers(result.data);
    })();
    return () => {
      active = false;
    };
  }, [token, dayId]);

  // Record a freshly submitted answer so it becomes the latest for its question.
  const handleAnswerSubmitted = (answer: PracticeAnswer) => {
    setAnswers((prev) => [answer, ...prev]);
  };

  const handleComplete = async () => {
    if (!token) return;
    setCompleting(true);
    setError(null);
    const result = await completeDay(token, dayId);
    setCompleting(false);
    if (result.error || !result.data) {
      setError(result.error ?? 'Failed to mark day as complete');
      return;
    }
    onCompleted(result.data);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">
              Day {dayNumber} · {completed ? 'Revisit' : 'Practice'}
            </p>
            <h2 className="font-semibold text-gray-900 text-lg leading-snug">{topic}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading ? (
            <PracticeSkeleton />
          ) : error && !content ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500 mb-4">{error}</p>
            </div>
          ) : content ? (
            <>
              {/* Overview */}
              {content.description && (
                <section>
                  <SectionHeading icon={<BookOpen size={14} />} label="Overview" />
                  <p className="text-sm text-gray-600 leading-relaxed">{content.description}</p>
                </section>
              )}

              {/* Where to learn */}
              {content.resources.length > 0 && (
                <section>
                  <SectionHeading icon={<ExternalLink size={14} />} label="Where to learn" />
                  <ul className="space-y-2">
                    {content.resources.map((r, i) => (
                      <li key={i}>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
                        >
                          <span className="truncate">{r.title}</span>
                          <ExternalLink
                            size={13}
                            className="shrink-0 text-emerald-400 group-hover:text-emerald-600"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Practice questions */}
              {content.questions.length > 0 && (
                <section>
                  <SectionHeading icon={<ListChecks size={14} />} label="Practice questions" />
                  <ol className="space-y-4">
                    {content.questions.map((q, i) => (
                      <PracticeQuestionItem
                        key={q.id}
                        dayId={dayId}
                        question={q}
                        index={i}
                        existingAnswer={latestAnswerByQuestion[q.id]}
                        onSubmitted={handleAnswerSubmitted}
                      />
                    ))}
                  </ol>
                </section>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          {completed ? (
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
            >
              <Check size={15} strokeWidth={3} className="text-emerald-500" />
              Completed · Close
            </button>
          ) : (
            <>
              {error && content && <p className="text-xs text-rose-600 mb-2">{error}</p>}
              <button
                onClick={handleComplete}
                disabled={completing || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-emerald-200"
              >
                {completing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Mark as complete
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Single practice question with answer submission + AI score ────────────────

function scoreBadgeClass(score: number): string {
  if (score >= 7) return 'bg-emerald-50 text-emerald-600';
  if (score >= 4) return 'bg-amber-50 text-amber-600';
  return 'bg-rose-50 text-rose-600';
}

function PracticeQuestionItem({
  dayId,
  question,
  index,
  existingAnswer,
  onSubmitted,
}: {
  dayId: string;
  question: PracticeQuestion;
  index: number;
  existingAnswer?: PracticeAnswer;
  onSubmitted: (answer: PracticeAnswer) => void;
}) {
  const { token } = useAuth();
  const [result, setResult] = useState<PracticeAnswer | undefined>(existingAnswer);
  const [open, setOpen] = useState(false); // whether the answer input is expanded
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep in sync if a prefill arrives after mount.
  useEffect(() => {
    setResult(existingAnswer);
  }, [existingAnswer]);

  const startEditing = () => {
    setText(result?.answer_text ?? '');
    setError(null);
    setOpen(true);
  };

  const cancel = () => {
    setOpen(false);
    setText('');
    setError(null);
  };

  const submit = async () => {
    if (!token || !text.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await submitAnswer(token, dayId, question.id, text.trim());
    setSubmitting(false);
    if (res.error || !res.data) {
      setError(res.error ?? 'Failed to submit answer');
      return;
    }
    setResult(res.data);
    onSubmitted(res.data);
    setOpen(false);
    setText('');
  };

  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center mt-0.5">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800 leading-relaxed">{question.text}</p>
        <span
          className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            DIFFICULTY_STYLES[question.difficulty] ?? 'bg-gray-100 text-gray-500'
          }`}
        >
          {question.difficulty}
        </span>

        {/* Saved answer (read-only) */}
        {result && !open && (
          <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${scoreBadgeClass(
                  result.ai_score ?? 0
                )}`}
              >
                <Sparkles size={11} />
                Score: {result.ai_score ?? 0}/10
              </span>
              <button
                onClick={startEditing}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <PencilLine size={12} />
                Edit / resubmit
              </button>
            </div>
            <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
              {result.answer_text}
            </p>
            {result.ai_feedback && (
              <p className="mt-2 text-[12px] text-gray-500 leading-relaxed border-t border-gray-100 pt-2">
                {result.ai_feedback}
              </p>
            )}
          </div>
        )}

        {/* Collapsed prompt to answer (only when nothing saved yet) */}
        {!result && !open && (
          <button
            onClick={startEditing}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <PencilLine size={13} />
            Your Answer
          </button>
        )}

        {/* Answer editor */}
        {open && (
          <div className="mt-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Type or paste your answer…"
              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-[13px] text-gray-800 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
            />
            {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={submit}
                disabled={submitting || !text.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Scoring…
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    Submit
                  </>
                )}
              </button>
              <button
                onClick={cancel}
                disabled={submitting}
                className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 text-gray-400">
      {icon}
      <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}

function PracticeSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[0, 1, 2].map((s) => (
        <div key={s} className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-28" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-5/6" />
        </div>
      ))}
    </div>
  );
}
