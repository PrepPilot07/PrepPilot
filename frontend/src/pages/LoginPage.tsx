import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuth } from '../store/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await authApi.login(email, password);
    setLoading(false);

    if (result.error || !result.data) {
      if (result.status === 401) {
        setError('Incorrect email or password. Please try again.');
      } else if (result.status === 400) {
        setError(result.error || 'Please fill in all fields.');
      } else {
        setError(result.error || 'Something went wrong. Please try again.');
      }
      return;
    }

    login(result.data.token, result.data.user);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex font-['Inter',sans-serif] bg-white">

      {/* ── Left: Branding panel ────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500">
        {/* Decorative layers */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full opacity-[0.07]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-white/5" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <span className="text-white font-black text-lg">P</span>
            </div>
            <span className="text-white/90 font-bold text-xl tracking-tight">PrepPilot</span>
          </div>

          {/* Hero content */}
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" />
              <span className="text-white/90 text-xs font-medium tracking-wide">AI-Powered Interview Coach</span>
            </div>
            <h1 className="text-[2.75rem] font-extrabold text-white leading-[1.1] mb-5 tracking-tight">
              Land the role<br />you deserve.
            </h1>
            <p className="text-white/70 text-[15px] leading-relaxed max-w-sm">
              One sharp question a day. Honest feedback. A readiness score that moves as you improve. Your personal interview mentor, always in your pocket.
            </p>

            {/* Social proof */}
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2.5">
                {['#34d399','#6ee7b7','#a7f3d0','#d1fae5'].map((bg, i) => (
                  <div key={i} className="w-9 h-9 rounded-full border-2 border-emerald-600 flex items-center justify-center text-[10px] font-bold text-emerald-900" style={{ backgroundColor: bg }}>
                    {['SR','RA','GE','AK'][i]}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-white/90 text-sm font-semibold">Trusted by candidates</p>
                <p className="text-white/50 text-xs">preparing for top tech roles</p>
              </div>
            </div>
          </div>

          {/* Bottom quote */}
          <div className="flex items-start gap-3 max-w-md">
            <div className="w-1 h-12 rounded-full bg-white/30 shrink-0" />
            <div>
              <p className="text-white/60 text-sm italic leading-relaxed">
                "PrepPilot helped me stay consistent. I went from scattered prep to landing my dream role in 3 weeks."
              </p>
              <p className="text-white/40 text-xs mt-2 font-medium">Interview candidate</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Login form ───────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative">
        {/* Subtle background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-50 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-20 left-20 w-56 h-56 bg-teal-50 rounded-full blur-3xl opacity-40" />
        </div>

        <div className="relative w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white font-black text-lg">P</span>
            </div>
            <span className="text-gray-900 font-bold text-xl tracking-tight">PrepPilot</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[1.75rem] font-extrabold text-gray-900 tracking-tight">
              Welcome back
            </h1>
            <p className="text-gray-500 text-[15px] mt-2">
              Sign in to continue your prep journey.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" id="login-form" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-[13px] font-semibold text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <input
                  id="login-email"
                  type="email"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm placeholder-gray-400 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:text-black transition-all duration-200"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-[13px] font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm placeholder-gray-400 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:text-black transition-all duration-200"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl" role="alert">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-[15px] text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-600/20 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" id="go-to-signup" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
              Create one
            </Link>
          </p>

          {/* Footer */}
          <p className="text-center text-[11px] text-gray-400 mt-8">
            By continuing you agree to our Terms of Service.<br />
            No spam, ever. Only your coach.
          </p>
        </div>
      </div>
    </div>
  );
}
