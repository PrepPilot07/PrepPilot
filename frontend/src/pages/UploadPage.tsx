import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { uploadDocuments, UploadResult } from '../api/upload';

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkillPill({ skill }: { skill: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-violet-900/30
      border border-violet-700/30 text-violet-300 text-xs font-medium">
      {skill}
    </span>
  );
}

function ResultCard({ result }: { result: UploadResult }) {
  const { resume, jd } = result;
  const topSkills = resume.skills.slice(0, 10);
  const reqSkills = jd.required_skills.slice(0, 8);
  const matchedSkills = resume.skills.filter(s =>
    jd.required_skills.some(r => r.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-[fadeIn_0.4s_ease]">
      {/* Success banner */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl
        bg-green-900/20 border border-green-800/40">
        <div className="w-8 h-8 rounded-full bg-green-900/40 border border-green-700/40
          flex items-center justify-center text-green-400 shrink-0">
          <IconCheck />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Profile analysed successfully</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Your resume and job description have been parsed and saved.
          </p>
        </div>
      </div>

      {/* Two-column result summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Resume card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-900/30 border border-violet-800/40
              flex items-center justify-center text-violet-400">
              <IconFile />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Resume</p>
              <p className="font-semibold text-white text-sm">{resume.name || 'Candidate'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Skills', value: resume.skills.length },
              { label: 'Jobs', value: resume.experience.length },
              { label: 'Projects', value: resume.projects.length },
            ].map(s => (
              <div key={s.label} className="bg-gray-800/50 rounded-xl py-3">
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {topSkills.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">Top skills</p>
              <div className="flex flex-wrap gap-1.5">
                {topSkills.map(s => <SkillPill key={s} skill={s} />)}
                {resume.skills.length > 10 && (
                  <span className="text-xs text-gray-600 self-center">
                    +{resume.skills.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* JD card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-900/30 border border-indigo-800/40
              flex items-center justify-center text-indigo-400">
              <IconBriefcase />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Target Role</p>
              <p className="font-semibold text-white text-sm leading-tight">
                {jd.role_title || 'Role'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: 'Required Skills', value: jd.required_skills.length },
              { label: 'Skills Matched', value: matchedSkills.length },
            ].map(s => (
              <div key={s.label} className="bg-gray-800/50 rounded-xl py-3">
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {reqSkills.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">Must-have skills</p>
              <div className="flex flex-wrap gap-1.5">
                {reqSkills.map(s => (
                  <span key={s}
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border
                      ${matchedSkills.map(m => m.toLowerCase()).includes(s.toLowerCase())
                        ? 'bg-green-900/20 border-green-700/30 text-green-400'
                        : 'bg-gray-800/60 border-gray-700/40 text-gray-500'
                      }`}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Experience summary */}
      {resume.experience.length > 0 && (
        <div className="card p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Experience</p>
          <div className="space-y-2">
            {resume.experience.slice(0, 3).map((exp, i) => (
              <div key={i} className="flex items-center justify-between py-2
                border-b border-gray-800/60 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{exp.role}</p>
                  <p className="text-xs text-gray-500">{exp.company}</p>
                </div>
                <span className="text-xs text-gray-600 bg-gray-800/60 px-2.5 py-1 rounded-lg">
                  {exp.duration}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        disabled
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
          bg-gray-800/60 border border-gray-700/40 text-gray-600
          text-sm font-semibold cursor-not-allowed"
        title="Coming in the next milestone"
      >
        Continue to Your Roadmap →
        <span className="text-xs font-normal ml-1 text-gray-700">(Coming soon)</span>
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleFileSelect = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
      setError('Only PDF and DOCX files are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10 MB.');
      return;
    }
    setError('');
    setResumeFile(file);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!token || !resumeFile || !jdText.trim()) return;
    setStatus('loading');
    setError('');

    const resp = await uploadDocuments(token, resumeFile, jdText);

    if (resp.error || !resp.data) {
      setStatus('error');
      setError(resp.error || 'Something went wrong. Please try again.');
      return;
    }

    setResult(resp.data);
    setStatus('success');
    // Navigate to the full analysis page, passing all agent data
    navigate('/analysis', { state: { result: resp.data } });
  };

  const canSubmit = !!resumeFile && jdText.trim().length > 20 && status !== 'loading';

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-10 border-b border-gray-800/70
        bg-gray-950/80 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-sm text-gray-500
                hover:text-gray-300 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                className="w-4 h-4">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Dashboard
            </button>
            <span className="text-gray-700">/</span>
            <span className="text-sm text-white font-medium">Upload Documents</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500
              to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="font-bold text-white text-sm tracking-tight">PrepPilot</span>
          </div>
        </div>
      </nav>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 space-y-8">

        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold
            text-violet-400 uppercase tracking-widest mb-3
            bg-violet-900/20 border border-violet-800/30 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            Step 2 of 4
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Upload Your Documents</h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
            Drop in your resume and paste the job description.
            Our AI will extract your skills and identify exactly what to work on.
          </p>
        </div>

        {/* Show result or upload form */}
        {status === 'success' && result ? (
          <ResultCard result={result} />
        ) : (
          <>
            {/* Upload panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* ── Left: Resume Drop Zone ─────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-violet-900/40 border
                    border-violet-800/50 flex items-center justify-center
                    text-violet-400 text-xs font-bold">1</span>
                  Resume
                  <span className="text-xs font-normal text-gray-600">PDF or DOCX · max 10 MB</span>
                </label>

                {resumeFile ? (
                  /* Selected file display */
                  <div className="card p-5 flex items-center gap-4 border-violet-800/40
                    bg-violet-900/10">
                    <div className="w-10 h-10 rounded-xl bg-violet-900/40
                      border border-violet-800/50 flex items-center
                      justify-center text-violet-400 shrink-0">
                      <IconFile />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {resumeFile.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatBytes(resumeFile.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => setResumeFile(null)}
                      className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-red-900/40
                        border border-gray-700 hover:border-red-800/50
                        flex items-center justify-center text-gray-500
                        hover:text-red-400 transition-all shrink-0"
                    >
                      <IconX />
                    </button>
                  </div>
                ) : (
                  /* Drop zone */
                  <div
                    id="resume-drop-zone"
                    className={`card flex flex-col items-center justify-center
                      gap-4 py-12 px-6 cursor-pointer transition-all duration-300
                      ${isDragging
                        ? 'border-violet-500/60 bg-violet-900/15 shadow-[0_0_30px_-8px_rgba(139,92,246,0.3)]'
                        : 'border-gray-700/60 hover:border-violet-700/50 hover:bg-violet-900/5'
                      }`}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center
                      justify-center transition-colors duration-300
                      ${isDragging
                        ? 'bg-violet-800/40 border border-violet-700/50 text-violet-300'
                        : 'bg-gray-800/60 border border-gray-700/60 text-gray-500'
                      }`}>
                      <IconUpload />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-300">
                        {isDragging ? 'Drop your resume here' : 'Drag & drop your resume'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        or{' '}
                        <span className="text-violet-400 hover:text-violet-300
                          transition-colors font-medium">
                          click to browse
                        </span>
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      id="resume-file-input"
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.doc"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelect(f);
                        e.target.value = '';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* ── Right: JD textarea ────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <label
                  htmlFor="jd-textarea"
                  className="text-sm font-semibold text-white flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded-md bg-indigo-900/40 border
                    border-indigo-800/50 flex items-center justify-center
                    text-indigo-400 text-xs font-bold">2</span>
                  Job Description
                  <span className="text-xs font-normal text-gray-600">paste the full JD</span>
                </label>

                <textarea
                  id="jd-textarea"
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                  placeholder="Paste the full job description here…&#10;&#10;Include the role title, responsibilities, required skills, and any other details."
                  className="flex-1 min-h-[240px] w-full px-4 py-3.5 rounded-2xl
                    bg-gray-900/60 border border-gray-800/60 backdrop-blur-sm
                    text-sm text-gray-200 placeholder:text-gray-600
                    focus:outline-none focus:border-indigo-700/60 focus:bg-indigo-900/5
                    transition-all duration-300 resize-none
                    scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700"
                />

                {jdText.length > 0 && (
                  <p className="text-xs text-gray-700 text-right -mt-1">
                    {jdText.length} characters
                  </p>
                )}
              </div>
            </div>

            {/* Error banner */}
            {(error || status === 'error') && (
              <div className="flex items-start gap-3 px-5 py-4 rounded-2xl
                bg-red-900/20 border border-red-800/40 text-sm text-red-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                  className="w-5 h-5 shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error || 'Something went wrong. Please try again.'}
              </div>
            )}

            {/* Loading state */}
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-5 py-8">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-violet-900/40" />
                  <div className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-violet-400">
                    <IconSpark />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-white">Running multi-agent analysis…</p>
                  <p className="text-xs text-gray-600">6 AI agents evaluating your profile in parallel</p>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                    {['Skills', 'Experience', 'Education', 'Culture Fit', 'Questions', 'Summary'].map(a => (
                      <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-violet-900/20 border border-violet-800/30 text-violet-400 animate-pulse">{a}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-700 mt-2">This usually takes 20–40 seconds</p>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              id="analyse-button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full flex items-center justify-center gap-2.5 py-4
                rounded-2xl text-sm font-semibold transition-all duration-300
                ${canSubmit
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30 hover:shadow-violet-800/40 hover:brightness-110 active:scale-[0.99]'
                  : 'bg-gray-800/60 border border-gray-700/40 text-gray-600 cursor-not-allowed'
                }`}
            >
              {status === 'loading' ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30
                    border-t-white animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  Analyse My Profile
                  <IconArrowRight />
                </>
              )}
            </button>

            {!canSubmit && status !== 'loading' && (
              <p className="text-xs text-gray-700 text-center -mt-4">
                {!resumeFile && !jdText.trim()
                  ? 'Add your resume and job description to continue'
                  : !resumeFile
                  ? 'Upload your resume to continue'
                  : 'Paste a job description (at least 20 characters) to continue'}
              </p>
            )}
          </>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800/50 py-4 text-center
        text-xs text-gray-700">
        PrepPilot · AI interview coaching over WhatsApp · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
