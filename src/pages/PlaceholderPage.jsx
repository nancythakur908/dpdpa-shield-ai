import { Link } from 'react-router-dom';

/**
 * Reusable placeholder for modules that will be built in later phases.
 * Shows a professional empty state instead of a blank page.
 */
export default function PlaceholderPage({ title, description, icon = '◎', comingSoon = false }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="w-full max-w-lg">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-700/60 bg-slate-900/60 text-4xl">
          {icon}
        </div>

        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>

        {comingSoon && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/8 px-4 py-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-semibold text-blue-300">Coming in Phase 3–4</span>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard"
            className="rounded-full border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
          <Link
            to="/compliance-scanner"
            className="rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Run Readiness Assessment
          </Link>
        </div>
      </div>
    </div>
  );
}
