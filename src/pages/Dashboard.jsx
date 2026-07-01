import { useState } from 'react';
import ProgressBar from '../components/ProgressBar';
import ActivityTimeline from '../components/ActivityTimeline';
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
} from '../data/sampleData';

export default function Dashboard() {
  const [isTracking, setIsTracking] = useState(true);
  const complianceScore = companyProfile.complianceScore;
  const breachReadiness = 52;
  const vendorRiskStatus = 'Medium';
  const totalAssetsMapped = dataInventory.length;

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-950/95 via-slate-900 to-slate-950/90 p-8 shadow-soft">
        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr] xl:items-center">
          <div>
            <span className="inline-flex rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Business dashboard</span>
            <h1 className="mt-5 text-4xl font-semibold text-white sm:text-5xl">Arya Retail Pvt Ltd compliance control center</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Monitor DPDP readiness for your ecommerce business with premium governance widgets, consent coverage, breach readiness, vendor risk, and Data Principal request tracking.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <p className="text-sm text-slate-400">Employees</p>
                <p className="mt-3 text-3xl font-semibold text-white">85</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <p className="text-sm text-slate-400">Monthly users</p>
                <p className="mt-3 text-3xl font-semibold text-white">42,000</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <p className="text-sm text-slate-400">Industry</p>
                <p className="mt-3 text-3xl font-semibold text-white">Ecommerce</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Key readiness metrics</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.8rem] border border-slate-800 bg-slate-900/80 p-5">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>Overall compliance score</span>
                  <span className="text-white">{complianceScore}</span>
                </div>
                <ProgressBar value={64} label="Readiness" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.8rem] border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
                  <p>Vendor risk</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{vendorRiskStatus}</p>
                </div>
                <div className="rounded-[1.8rem] border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
                  <p>Breach readiness</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{breachReadiness}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((item) => (
          <div key={item.title} className="rounded-[1.6rem] border border-slate-800 bg-slate-950/95 p-5">
            <p className="text-sm text-slate-400">{item.title}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
            <p className="mt-2 text-sm text-slate-500">{item.change}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Operational snapshot</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Readiness performance and next actions</h2>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-900/90 px-4 py-2 text-sm text-slate-300">Focus on consent, breach, and vendor reviews</div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.6rem] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Data inventory</p>
              <p className="mt-3 text-3xl font-semibold text-white">{totalAssetsMapped} assets</p>
              <p className="mt-2 text-sm text-slate-500">Mapped to purpose, storage and vendor review</p>
            </div>
            <div className="rounded-[1.6rem] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Consent coverage</p>
              <p className="mt-3 text-3xl font-semibold text-white">71%</p>
              <p className="mt-2 text-sm text-slate-500">Current purpose-based coverage across workflows</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.6rem] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Document progress</p>
              <div className="mt-4 space-y-4">
                {documentProgress.map((doc) => (
                  <div key={doc.label}>
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>{doc.label}</span>
                      <span>{doc.value}%</span>
                    </div>
                    <ProgressBar value={doc.value} label="" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Consent coverage by purpose</p>
              <div className="mt-4 space-y-4">
                {consentCoverage.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <ProgressBar value={item.value} label="" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Request status</p>
            <div className="mt-5 space-y-3">
              {requestStatus.map((item) => (
                <div key={item.label} className="rounded-3xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    <span className="font-semibold text-white">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Vendor risk distribution</p>
            <div className="mt-5 space-y-4">
              {vendorRiskDistribution.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{item.label}</span>
                    <span className="text-white">{item.value}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-800">
                    <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Priority actions</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Remediation and risk control tasks</h2>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-900/90 px-4 py-2 text-sm text-slate-300">High-priority consent and breach tasks</div>
          </div>
          <div className="mt-6 space-y-4">
            {pendingActions.map((action) => (
              <div key={action.title} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 text-sm text-slate-300">
                <p className="font-semibold text-white">{action.title}</p>
                <p className="mt-2">{action.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Consent withdrawal summary</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Recent withdrawals</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {recentWithdrawals.map((item) => (
              <div key={item.user} className="rounded-3xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                <p className="font-semibold text-white">{item.user}</p>
                <p>{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Activity log</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Recent compliance operations</h2>
          </div>
          <div className="text-sm text-slate-400">Designed for governance reviews and executive reporting.</div>
        </div>
        <div className="mt-6">
          <ActivityTimeline items={dashboardActivities} />
        </div>
      </div>
    </div>
  );
}
