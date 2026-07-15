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
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
      {skill}
    </span>
  );
}

function ResultCard({ result }: { result: UploadResult }) {
  const navigate = useNavigate();
  const { resume, jd } = result;
  const topSkills = resume.skills.slice(0, 10);
  const reqSkills = jd.required_skills.slice(0, 8);
  const matchedSkills = resume.skills.filter(s =>
    jd.required_skills.some(r => r.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-[fadeIn_0.4s_ease]">
      {/* Success banner */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
        <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
          <IconCheck />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Profile analysed successfully</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Your resume and job description have been parsed and saved.
          </p>
        </div>
      </div>

      {/* Two-column result summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Resume card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600">
              <IconFile />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Resume</p>
              <p className="font-semibold text-gray-900 text-sm">{resume.name || 'Candidate'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Skills', value: resume.skills.length },
              { label: 'Jobs', value: resume.experience.length },
              { label: 'Projects', value: resume.projects.length },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl py-3 border border-gray-100">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {topSkills.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Top skills</p>
              <div className="flex flex-wrap gap-1.5">
                {topSkills.map(s => <SkillPill key={s} skill={s} />)}
                {resume.skills.length > 10 && (
                  <span className="text-xs text-gray-500 self-center font-medium ml-1">
                    +{resume.skills.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* JD card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <IconBriefcase />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Target Role</p>
              <p className="font-semibold text-gray-900 text-sm leading-tight">
                {jd.role_title || 'Role'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: 'Required Skills', value: jd.required_skills.length },
              { label: 'Skills Matched', value: matchedSkills.length },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl py-3 border border-gray-100">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {reqSkills.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Must-have skills</p>
              <div className="flex flex-wrap gap-1.5">
                {reqSkills.map(s => (
                  <span key={s}
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${
                      matchedSkills.map(m => m.toLowerCase()).includes(s.toLowerCase())
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">Experience</p>
          <div className="space-y-2">
            {resume.experience.slice(0, 3).map((exp, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{exp.role}</p>
                  <p className="text-xs text-gray-500">{exp.company}</p>
                </div>
                <span className="text-xs text-gray-500 font-medium bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
                  {exp.duration}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate('/analysis')}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          View Full Report
          <IconArrowRight />
        </button>
        <button
          onClick={() => {
            window.location.reload();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors"
        >
          Analyse New Resume
        </button>
      </div>
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
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-7 animate-in fade-in duration-500 pb-16">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">Upload Your Documents</h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
          Drop in your resume and paste the job description.
          Our AI will extract your skills and identify exactly what to work on.
        </p>
      </div>

      {/* ── Show result or upload form ──────────────────────────────────────── */}
      {status === 'success' && result ? (
        <ResultCard result={result} />
      ) : (
        <>
          {/* Upload panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* ── Left: Resume Drop Zone ───────────────────────────────────── */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 text-xs font-bold">1</span>
                Resume
                <span className="text-xs font-normal text-gray-400">PDF or DOCX &middot; max 10 MB</span>
              </label>

              {resumeFile ? (
                /* Selected file display */
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                    <IconFile />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {resumeFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatBytes(resumeFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => setResumeFile(null)}
                    className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all shrink-0"
                  >
                    <IconX />
                  </button>
                </div>
              ) : (
                /* Drop zone */
                <div
                  id="resume-drop-zone"
                  className={`bg-white rounded-2xl border flex flex-col items-center justify-center gap-4 py-14 px-6 cursor-pointer transition-all duration-300 ${
                    isDragging
                      ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                      : 'border-gray-200 border-dashed hover:border-emerald-300 hover:bg-gray-50'
                  }`}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
                    isDragging
                      ? 'bg-emerald-100 border border-emerald-200 text-emerald-600'
                      : 'bg-gray-100 border border-gray-200 text-gray-400'
                  }`}>
                    <IconUpload />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900">
                      {isDragging ? 'Drop your resume here' : 'Drag & drop your resume'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      or{' '}
                      <span className="text-emerald-600 font-medium">click to browse</span>
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

            {/* ── Right: JD textarea ──────────────────────────────────────── */}
            <div className="flex flex-col gap-3">
              <label
                htmlFor="jd-textarea"
                className="text-sm font-semibold text-gray-900 flex items-center gap-2"
              >
                <span className="w-5 h-5 rounded-md bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 text-xs font-bold">2</span>
                Job Description
                <span className="text-xs font-normal text-gray-400">paste the full JD</span>
              </label>

              <textarea
                id="jd-textarea"
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder={"Paste the full job description here\u2026\n\nInclude the role title, responsibilities, required skills, and any other details."}
                className="flex-1 min-h-[240px] w-full px-4 py-3.5 rounded-2xl bg-white border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200 resize-none"
              />

              {jdText.length > 0 && (
                <p className="text-[11px] text-gray-400 text-right -mt-1">
                  {jdText.length} characters
                </p>
              )}
            </div>
          </div>

          {/* Error banner */}
          {(error || status === 'error') && (
            <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                className="w-5 h-5 shrink-0 mt-0.5 text-red-500">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error || 'Something went wrong. Please try again.'}
            </div>
          )}

          {/* Loading state */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-5 py-10">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-100" />
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <IconSpark />
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-bold text-gray-900">Running multi-agent analysis...</p>
                <p className="text-xs text-gray-500">6 AI agents evaluating your profile in parallel</p>
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {['Skills', 'Experience', 'Education', 'Culture Fit', 'Questions', 'Summary'].map(a => (
                    <span key={a} className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 animate-pulse font-medium">{a}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">This usually takes 20-40 seconds</p>
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            id="analyse-button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-semibold transition-all duration-200 ${
              canSubmit
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 active:scale-[0.99]'
                : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {status === 'loading' ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Analysing...
              </>
            ) : (
              <>
                Analyse My Profile
                <IconArrowRight />
              </>
            )}
          </button>

          {!canSubmit && status !== 'loading' && (
            <p className="text-xs text-gray-400 text-center -mt-3">
              {!resumeFile && !jdText.trim()
                ? 'Add your resume and job description to continue'
                : !resumeFile
                ? 'Upload your resume to continue'
                : jdText.trim().length <= 20
                ? 'Paste a job description (at least 20 characters) to continue'
                : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
}
