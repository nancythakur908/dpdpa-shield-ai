import { useState } from 'react';
import { companyProfile } from '../data/sampleData';

const recommendations = [
  'Add retention period in privacy notice.',
  'Review pending deletion requests.',
  'Keep breach response checklist updated.',
  'Ensure consent withdrawal is easy for users.',
];

export default function Reports() {
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerated(true);
    window.alert('Compliance report preview generated.');
  };

  const handlePdf = () => {
    const reportText = `Privora AI Executive Report\nCompany: ${companyProfile.companyName}\nDate: ${new Date().toLocaleDateString('en-IN')}\nCompliance Score: 82/100\nConsent Summary: 2,840 consents logged, 2,410 active, 186 withdrawn.\nRights Request Summary: 24 requests pending review with 2 high-priority deletion cases.\nBreach Summary: 3 incidents recorded; no critical breach is currently open.`;
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dpdpa-executive-report.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Reports</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Executive compliance report</h2>
          </div>
          <div className="flex gap-3">
            <button className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200" onClick={handleGenerate}>Generate Report</button>
            <button className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200" onClick={handlePdf}>Download PDF</button>
            <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white" onClick={handlePrint}>Print Report</button>
          </div>
        </div>
      </div>

      {generated && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Company</p>
                <p className="mt-2 text-xl font-semibold text-white">{companyProfile.companyName}</p>
                <p className="text-sm text-slate-400">{companyProfile.industry}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Report date</p>
                <p className="mt-2 text-lg font-semibold text-white">{new Date().toLocaleDateString('en-IN')}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Compliance score</p>
                <p className="mt-2 text-3xl font-semibold text-white">82/100</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Consent summary</p>
                <p className="mt-2 text-sm text-slate-300">2,840 consents logged, 2,410 active, 186 withdrawn.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Rights request summary</p>
                <p className="mt-2 text-sm text-slate-300">24 requests pending review with 2 high-priority deletion cases.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Breach summary</p>
                <p className="mt-2 text-sm text-slate-300">3 incidents recorded; no critical breach is currently open.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">AI recommendations</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {recommendations.map((item) => (
                    <li key={item} className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
