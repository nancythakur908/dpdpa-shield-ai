import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import brand from '../config/brand';
import dbStore from '../utils/dbStore';

export default function Login({ resetMode = false }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(resetMode ? 'reset' : 'signin'); // signin | signup | forgot | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      await dbStore.signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email || !password || !fullName) { setError('All fields are required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await dbStore.signUp(email, password, fullName);
      setSuccess('Account created. Check your email to confirm your address before signing in.');
      setMode('signin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email) { setError('Enter your email address.'); return; }
    setLoading(true);
    try {
      await dbStore.sendPasswordReset(email);
      setSuccess('Password reset email sent. Check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await dbStore.updatePassword(newPassword);
      setSuccess('Password updated. Signing you in…');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,235,0.15), transparent), linear-gradient(160deg, #020617 0%, #060f1e 50%, #020617 100%)',
      }}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800/60 bg-[#060f1e]/90 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">

          {/* Left — Brand panel */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600/12 via-transparent to-emerald-500/8 p-8 lg:p-12">
            <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-12 h-80 w-80 rounded-full bg-emerald-500/8 blur-3xl" />

            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-400 shadow-lg shadow-blue-500/30">
                <span className="text-base font-black text-white">PS</span>
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight text-white">{brand.name}</p>
                <p className="text-xs text-slate-400">{brand.platformLabel}</p>
              </div>
            </div>

            <h1 className="relative mt-10 text-3xl font-bold leading-tight text-white sm:text-4xl">
              {brand.heroHeadline}
            </h1>
            <p className="relative mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              {brand.heroSubline}
            </p>

            <div className="relative mt-8 space-y-2">
              {[
                'DPDP Readiness Assessment & Action Plan',
                'Consent governance and withdrawal management',
                'Rights requests and grievance workflows',
                'Vendor risk lifecycle and DPA tracking',
                'Incident response and breach management',
                'AI Copilot for guidance — not legal advice',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5 rounded-xl border border-slate-800/60 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  {feat}
                </div>
              ))}
            </div>
            <p className="relative mt-6 text-xs italic text-slate-600">{brand.tagline}</p>
          </div>

          {/* Right — Auth form */}
          <div className="p-8 lg:p-12">

            {/* Sign In */}
            {mode === 'signin' && (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-400/80">Welcome back</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Sign in to your workspace</h2>

                {success && <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5 text-xs text-emerald-400">{success}</div>}

                <form className="mt-6 space-y-4" onSubmit={handleSignIn} noValidate>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-400">Work email</span>
                    <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="you@company.in" autoComplete="email" required />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-400">Password</span>
                    <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="••••••••" autoComplete="current-password" />
                  </label>

                  <div className="flex justify-end">
                    <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition">
                      Forgot password?
                    </button>
                  </div>

                  {error && <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-3 py-2.5 text-xs text-rose-400">{error}</div>}

                  <button id="login-submit-btn" type="submit" disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                    {loading ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>

                <p className="mt-5 text-center text-xs text-slate-500">
                  Don't have an account?{' '}
                  <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }} className="text-blue-400 hover:text-blue-300">
                    Create account
                  </button>
                </p>
                <p className="mt-4 text-center text-[10px] leading-relaxed text-slate-600">{brand.disclaimer}</p>
              </>
            )}

            {/* Sign Up */}
            {mode === 'signup' && (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-400/80">New account</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Create your workspace</h2>

                <form className="mt-6 space-y-4" onSubmit={handleSignUp} noValidate>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-400">Full name</span>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Nikhil Sharma" autoComplete="name" required />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-400">Work email</span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="you@company.in" autoComplete="email" required />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-400">Password (min 8 characters)</span>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="••••••••" autoComplete="new-password" required />
                  </label>

                  {error && <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-3 py-2.5 text-xs text-rose-400">{error}</div>}
                  {success && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5 text-xs text-emerald-400">{success}</div>}

                  <button type="submit" disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                    {loading ? 'Creating account…' : 'Create account'}
                  </button>
                </form>

                <p className="mt-5 text-center text-xs text-slate-500">
                  Already have an account?{' '}
                  <button onClick={() => { setMode('signin'); setError(''); setSuccess(''); }} className="text-blue-400 hover:text-blue-300">
                    Sign in
                  </button>
                </p>
              </>
            )}

            {/* Forgot Password */}
            {mode === 'forgot' && (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-400/80">Reset password</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Forgot your password?</h2>
                <p className="mt-1 text-xs text-slate-400">Enter your email and we'll send you a reset link.</p>

                <form className="mt-6 space-y-4" onSubmit={handleForgotPassword} noValidate>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-400">Work email</span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="you@company.in" autoComplete="email" required />
                  </label>

                  {error && <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-3 py-2.5 text-xs text-rose-400">{error}</div>}
                  {success && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5 text-xs text-emerald-400">{success}</div>}

                  <button type="submit" disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>

                <p className="mt-5 text-center text-xs text-slate-500">
                  <button onClick={() => { setMode('signin'); setError(''); setSuccess(''); }} className="text-blue-400 hover:text-blue-300">
                    ← Back to sign in
                  </button>
                </p>
              </>
            )}

            {/* Reset Password */}
            {mode === 'reset' && (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-400/80">New password</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Set your new password</h2>

                <form className="mt-6 space-y-4" onSubmit={handleResetPassword} noValidate>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-400">New password (min 8 characters)</span>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="••••••••" autoComplete="new-password" required />
                  </label>

                  {error && <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-3 py-2.5 text-xs text-rose-400">{error}</div>}
                  {success && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5 text-xs text-emerald-400">{success}</div>}

                  <button type="submit" disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                    {loading ? 'Updating…' : 'Update password'}
                  </button>
                </form>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
