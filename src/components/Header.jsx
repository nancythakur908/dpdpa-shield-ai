import { companyProfile } from '../data/sampleData';

export default function Header({ title }) {
  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-4 backdrop-blur sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">DPDPA Shield AI</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-white sm:text-2xl">{title}</h1>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-300">
              {companyProfile.companyName} • {companyProfile.industry}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2">
            <input type="search" placeholder="Search compliance" className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500" />
            <span className="text-slate-500">🔍</span>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Admin</p>
            <p className="font-semibold text-white">{companyProfile.adminName}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Score</p>
            <p className="font-semibold text-white">{companyProfile.complianceScore || '64%'}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-200">
            <p className="text-xs uppercase tracking-[0.24em]">Status</p>
            <p className="font-semibold">Readiness mode</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Date</p>
            <p className="font-semibold text-white">{today}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
