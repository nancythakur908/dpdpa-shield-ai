import { Link } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import ActivityTimeline from '../components/ActivityTimeline';
import brand from '../config/brand';
import {
  dashboardStats,
  dashboardActivities,
  pendingActions,
  recentWithdrawals,
  requestStatus,
  vendorRiskDistribution,
  companyProfile,
  dataInventory,
  consentCoverage,
  documentProgress,
  aiInsights,
  readinessBreakdown,
  highRiskVendors,
} from '../config/demoData';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(dateStr) {
  return new Date(dateStr) < new Date();
}

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daysOverdue(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
  return diff;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ title, value, change, tone, detail }) {
  const toneMap = {
    blue: 'border-blue-500/20 bg-blue-500/6 text-blue-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/6 text-emerald-300',
    amber: 'border-amber-500/20 bg-amber-500/6 text-amber-300',
    rose: 'border-rose-500/20 bg-rose-500/6 text-rose-300',
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 transition hover:border-slate-700">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-white tracking-tight">{value}</p>
      <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${toneMap[tone] || toneMap.blue}`}>
        {change}
      </p>
      {detail && <p className="mt-2 text-xs text-slate-600">{detail}</p>}
    </div>
  );
}

function ActionRow({ action }) {
  const riskColor = action.riskLevel === 'High'
    ? 'text-rose-400 border-rose-500/20 bg-rose-500/8'
    : action.riskLevel === 'Medium'
    ? 'text-amber-400 border-amber-500/20 bg-amber-500/8'
    : 'text-slate-400 border-slate-700 bg-slate-900/40';

  const isActionOverdue = action.status === 'Overdue' || (action.dueDate && isOverdue(action.dueDate) && action.status !== 'Completed');

  return (
    <div className={`rounded-xl border p-4 transition ${
      isActionOverdue
        ? 'border-rose-500/20 bg-rose-500/5'
        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{action.title}</p>
            {isActionOverdue && (
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-400">
                Overdue {daysOverdue(action.dueDate) > 0 ? `${daysOverdue(action.dueDate)}d` : ''}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">{action.detail}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="text-slate-500">Owner: <span className="text-slate-400">{action.owner}</span></span>
            {action.dueDate && (
              <span className={isActionOverdue ? 'text-rose-400' : 'text-slate-500'}>
                Due: {formatDate(action.dueDate)}
              </span>
            )}
            <span className="text-slate-500">Module: <span className="text-slate-400">{action.module}</span></span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${riskColor}`}>
          {action.riskLevel}
        </span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const score = readinessBreakdown.score;
  const totalAssetsMapped = dataInventory.length;

  return (
    <div className="space-y-6">
      {/* ── Hero / Readiness command centre ── */}
      <div className="rounded-3xl border border-slate-800/60 bg-gradient-to-br from-[#060f1e] via-[#0a1628] to-[#060f1e] p-6 shadow-2xl shadow-black/40 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr] xl:items-start">
          {/* Left */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/8 px-3 py-1 text-xs font-semibold text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Demo Workspace
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-400">
                {companyProfile.companyName} · {companyProfile.industry}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
              Privacy Command Centre
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              {brand.description}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-xs text-slate-500">Employees</p>
                <p className="mt-2 text-2xl font-bold text-white">{companyProfile.employees}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-xs text-slate-500">Monthly users</p>
                <p className="mt-2 text-2xl font-bold text-white">{companyProfile.monthlyUsers}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-xs text-slate-500">Data assets</p>
                <p className="mt-2 text-2xl font-bold text-white">{totalAssetsMapped}</p>
              </div>
            </div>

            {/* Quick links */}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/compliance-scanner" className="rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90">
                Run Assessment
              </Link>
              <Link to="/rights-portal" className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800">
                Rights Requests
              </Link>
              <Link to="/vendor-risk" className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800">
                Vendor Risk
              </Link>
              <Link to="/document-generator" className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800">
                Generate Docs
              </Link>
            </div>
          </div>

          {/* Right — score panel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/80">
              {brand.scoreLabel}
            </p>
            <div className="mt-4">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-white">{score}</span>
                <span className="mb-2 text-2xl font-semibold text-slate-400">/100</span>
                <span className="mb-2 ml-1 flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                  ↑ +{readinessBreakdown.changeFromLast}
                </span>
              </div>
              <ProgressBar value={score} label="" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/6 p-3">
                <p className="text-lg font-bold text-emerald-300">{readinessBreakdown.controlsPassed}</p>
                <p className="text-[10px] text-emerald-500">Passed</p>
              </div>
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/6 p-3">
                <p className="text-lg font-bold text-amber-300">{readinessBreakdown.controlsPartial}</p>
                <p className="text-[10px] text-amber-500">Partial</p>
              </div>
              <div className="rounded-xl border border-rose-500/15 bg-rose-500/6 p-3">
                <p className="text-lg font-bold text-rose-300">{readinessBreakdown.controlsMissing}</p>
                <p className="text-[10px] text-rose-500">Missing</p>
              </div>
            </div>

            {/* Score change reasons */}
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 mb-2">Why did the score change?</p>
              <div className="space-y-1.5">
                {readinessBreakdown.changeReasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={r.direction === 'up' ? 'text-emerald-400' : 'text-rose-400'}>
                      {r.direction === 'up' ? '↑' : '↓'}
                    </span>
                    <span className={`font-semibold ${r.direction === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {r.direction === 'up' ? '+' : ''}{r.points}
                    </span>
                    <span className="text-slate-500 leading-tight">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-3 text-[9px] leading-relaxed text-slate-700">
              {brand.scoreSublabel}
            </p>
          </div>
        </div>
      </div>

      {/* ── Metric cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((item) => (
          <MetricCard key={item.title} {...item} />
        ))}
      </div>

      {/* ── Operations grid ── */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        {/* Left: document + consent progress */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/80">Operational Snapshot</p>
          <h2 className="mt-2 text-xl font-bold text-white">Readiness performance</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* Document progress */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Document progress</p>
              <div className="space-y-3">
                {documentProgress.map((doc) => (
                  <div key={doc.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">{doc.label}</span>
                      <span className="text-white font-medium">{doc.value}%</span>
                    </div>
                    <ProgressBar value={doc.value} label="" />
                  </div>
                ))}
              </div>
            </div>

            {/* Consent coverage */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Consent coverage by purpose</p>
              <div className="space-y-3">
                {consentCoverage.slice(0, 5).map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-white font-medium">{item.value}%</span>
                    </div>
                    <ProgressBar value={item.value} label="" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: request status + vendor risk */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/80 mb-4">Rights Request Status</p>
            <div className="space-y-2">
              {requestStatus.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5 text-sm">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="font-bold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/80 mb-4">Vendor Risk Distribution</p>
            <div className="space-y-3">
              {vendorRiskDistribution.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="font-semibold text-white">{item.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        item.label.includes('High') ? 'bg-rose-500' : item.label.includes('Medium') ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Priority actions ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/80">Priority Actions</p>
            <h2 className="mt-1 text-xl font-bold text-white">Remediation and risk control tasks</h2>
          </div>
          <Link to="/action-plan" className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800">
            View all actions →
          </Link>
        </div>
        <div className="space-y-3">
          {pendingActions.map((action) => (
            <ActionRow key={action.id} action={action} />
          ))}
        </div>
      </div>

      {/* ── High-risk vendors ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/80">Vendor Attention Required</p>
            <h2 className="mt-1 text-xl font-bold text-white">High-risk vendor status</h2>
          </div>
          <Link to="/vendor-risk" className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800">
            Vendor Register →
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {highRiskVendors.map((vendor) => (
            <div
              key={vendor.name}
              className={`rounded-xl border p-4 ${
                vendor.risk === 'High'
                  ? 'border-rose-500/20 bg-rose-500/5'
                  : 'border-amber-500/20 bg-amber-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-white">{vendor.name}</p>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  vendor.risk === 'High'
                    ? 'border-rose-500/30 text-rose-400'
                    : 'border-amber-500/30 text-amber-400'
                }`}>{vendor.risk}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{vendor.service}</p>
              <p className="mt-2 text-xs font-medium text-slate-300">{vendor.status}</p>
              {vendor.nextReview && (
                <p className={`mt-1 text-xs ${isOverdue(vendor.nextReview) ? 'text-rose-400 font-semibold' : 'text-slate-600'}`}>
                  Review: {isOverdue(vendor.nextReview) ? 'Overdue' : `Due ${formatDate(vendor.nextReview)}`}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent activity ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/80">Activity Log</p>
            <h2 className="mt-1 text-xl font-bold text-white">Recent compliance operations</h2>
          </div>
          <Link to="/audit-log" className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800">
            Full audit log →
          </Link>
        </div>
        <ActivityTimeline items={dashboardActivities} />
      </div>

      {/* ── Disclaimer footer ── */}
      <div className="rounded-xl border border-slate-800/40 bg-slate-900/20 px-4 py-3 text-xs leading-relaxed text-slate-600">
        {brand.disclaimer}
      </div>
    </div>
  );
}
