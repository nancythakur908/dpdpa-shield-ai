import { useNavigate } from 'react-router-dom';

export default function Login({ onLogin }) {
  const navigate = useNavigate();

  const handleLogin = (event) => {
    event.preventDefault();
    onLogin();
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.25),_transparent_35%),linear-gradient(135deg,_rgba(2,6,23,1),_rgba(15,23,42,1))] px-4 py-12">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 shadow-2xl shadow-blue-950/40">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-gradient-to-br from-blue-600/20 via-slate-950 to-emerald-500/10 p-8 lg:p-12">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-3 py-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-white">DPDPA Shield AI</p>
                <p className="text-xs text-slate-400">AI-powered privacy compliance for Indian businesses</p>
              </div>
            </div>

            <h1 className="mt-10 text-4xl font-semibold text-white sm:text-5xl">Secure compliance with AI-driven precision</h1>
            <p className="mt-4 max-w-xl text-lg text-slate-300">
              From consent capture to breach actioning, this premium MVP helps Indian businesses stay ready for DPDP Act operations.
            </p>

            <div className="mt-8 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">Consent lifecycle tracking</div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">Rights requests and grievance handling</div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">AI-generated privacy notices and reports</div>
            </div>
          </div>

          <div className="p-8 lg:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Welcome back</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Sign in to your workspace</h2>

            <form className="mt-8 space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Email</label>
                <input className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none" type="email" defaultValue="admin@brightlearn.ai" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Password</label>
                <input className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none" type="password" defaultValue="demo123" />
              </div>
              <button type="submit" className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Login</button>
            </form>

            <p className="mt-6 text-sm text-slate-400">
              Demo credentials: admin@brightlearn.ai / demo123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
