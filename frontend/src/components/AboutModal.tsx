import { useEffect, useRef } from 'react';
import {
  X,
  Compass,
  Upload,
  Map,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

// "How it works" steps — mirrors the pitch in README.md.
const STEPS: { icon: React.ReactNode; text: string }[] = [
  { icon: <Upload size={14} />, text: 'Upload your resume and paste the job description you’re targeting.' },
  { icon: <Map size={14} />, text: 'AI agents analyze your profile and build a personalized day-by-day roadmap around your skill gaps.' },
  { icon: <MessageSquare size={14} />, text: 'Each day you get a targeted interview question — delivered over WhatsApp or right on your dashboard.' },
  { icon: <Sparkles size={14} />, text: 'Reply with your answer and get an AI score plus specific feedback.' },
  { icon: <TrendingUp size={14} />, text: 'Your Readiness Score moves as you actually practice, so you know where you stand.' },
];

export default function AboutModal({ onClose }: AboutModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape to close + a light focus trap; move focus into the modal on open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Tab') {
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
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="About PrepPilot"
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white font-bold text-base">P</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 text-lg leading-snug">About PrepPilot</h2>
              <p className="text-[11px] text-gray-400">Version {__APP_VERSION__}</p>
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Blurb */}
          <section>
            <div className="flex items-center gap-1.5 mb-2 text-gray-400">
              <Compass size={14} />
              <span className="text-[11px] font-bold uppercase tracking-widest">What it is</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              PrepPilot is an AI-powered interview coach that turns your resume and a target
              job description into a personalized, day-by-day prep roadmap. It delivers one
              question a day, scores your answers with specific feedback, and tracks a
              Readiness Score that moves as you actually practice — so your prep stays
              consistent instead of going cold.
            </p>
          </section>

          {/* How it works */}
          <section>
            <div className="flex items-center gap-1.5 mb-3 text-gray-400">
              <Sparkles size={14} />
              <span className="text-[11px] font-bold uppercase tracking-widest">How it works</span>
            </div>
            <ol className="space-y-3">
              {STEPS.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mt-0.5">
                    {step.icon}
                  </span>
                  <p className="text-[13px] text-gray-700 leading-relaxed pt-1">{step.text}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-emerald-200"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
