import { useRef, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { consents as initialConsents } from '../data/sampleData';

const blankForm = {
  name: '',
  email: '',
  consentType: 'Marketing',
  purpose: '',
  status: 'Active',
};

export default function ConsentManagement() {
  const [consents, setConsents] = useState(initialConsents);
  const [form, setForm] = useState(blankForm);
  const formRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const entry = {
      id: Date.now(),
      name: form.name,
      email: form.email,
      consentType: form.consentType,
      purpose: form.purpose,
      status: form.status,
      date: new Date().toISOString().slice(0, 10),
    };
    setConsents([entry, ...consents]);
    setForm(blankForm);
  };

  const handleWithdraw = (id) => {
    setConsents(consents.map((item) => (item.id === id ? { ...item, status: 'Withdrawn' } : item)));
  };

  const handleExport = () => {
    const rows = consents.map((item) => [item.name, item.email, item.consentType, item.purpose, item.status, item.date].join(','));
    const csv = ['Name,Email,Consent Type,Purpose,Status,Date', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'consent-records.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const focusForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formRef.current?.querySelector('input')?.focus();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Consent Management</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Capture and maintain user consent digitally</h2>
          </div>
          <div className="flex gap-3">
            <button onClick={handleExport} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200">Export CSV</button>
            <button onClick={focusForm} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">Add Consent</button>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <input className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none" placeholder="User name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none" placeholder="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <select className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none" value={form.consentType} onChange={(event) => setForm({ ...form, consentType: event.target.value })}>
            <option>Marketing</option>
            <option>Communication</option>
            <option>Analytics</option>
            <option>Profiling</option>
          </select>
          <input className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none" placeholder="Purpose" value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} required />
          <select className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option>Active</option>
            <option>Withdrawn</option>
            <option>Pending</option>
          </select>
          <div className="md:col-span-2 xl:col-span-5">
            <button type="submit" className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white">Add Consent</button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Consent Records</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Latest consent ledger</h3>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Consent Type</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
              {consents.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-white">{item.name}</td>
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="px-4 py-3">{item.consentType}</td>
                  <td className="px-4 py-3">{item.purpose}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3">{item.date}</td>
                  <td className="px-4 py-3">
                    <button className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200" onClick={() => handleWithdraw(item.id)}>
                      Withdraw
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
        AI Tip: Consent records should clearly mention purpose and withdrawal option.
      </div>
    </div>
  );
}
