import { useCallback, useEffect, useMemo, useState } from 'react';
import dbStore from '../utils/dbStore';
import { resolveCurrentOrganisationId } from '../utils/currentOrganisation';

const initial = { title: '', description: '', category: 'Governance', likelihood: 3, impact: 3, status: 'Open', treatment: '', owner_name: '', review_date: '', inventory_record_ids: [] };
const inputClass = 'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500';
const categories = ['Governance', 'Transparency', 'Consent', 'Rights', 'Security', 'Vendor', 'Retention', 'Children', 'Incident', 'Other'];

export default function PrivacyRiskRegister() {
  const [orgId, setOrgId] = useState(null);
  const [risks, setRisks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState(initial);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sort, setSort] = useState('score_desc');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const activeOrgId = await resolveCurrentOrganisationId();
      const [riskRows, inventoryRows] = await Promise.all([dbStore.listPrivacyRisks(activeOrgId), dbStore.listDataInventory(activeOrgId)]);
      setOrgId(activeOrgId); setRisks(riskRows); setInventory(inventoryRows);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return risks.filter((risk) => (!query || [risk.title, risk.description, risk.owner_name].some((value) => value?.toLowerCase().includes(query))) && (statusFilter === 'All' || risk.status === statusFilter) && (categoryFilter === 'All' || risk.category === categoryFilter)).sort((left, right) => {
      if (sort === 'title_asc') return left.title.localeCompare(right.title);
      if (sort === 'review_asc') return (left.review_date || '9999').localeCompare(right.review_date || '9999');
      return right.inherent_score - left.inherent_score;
    });
  }, [risks, search, statusFilter, categoryFilter, sort]);

  function reset() { setForm(initial); setEditingId(null); }
  function edit(risk) {
    setEditingId(risk.id);
    setForm({ ...risk, review_date: risk.review_date || '', treatment: risk.treatment || '', owner_name: risk.owner_name || '', inventory_record_ids: risk.inventory_record_ids || [] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function toggleInventory(id) {
    setForm((current) => ({ ...current, inventory_record_ids: current.inventory_record_ids.includes(id) ? current.inventory_record_ids.filter((item) => item !== id) : [...current.inventory_record_ids, id] }));
  }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (editingId) {
        const saved = await dbStore.updatePrivacyRisk(orgId, editingId, form);
        const links = await dbStore.replacePrivacyRiskLinks(orgId, editingId, form.inventory_record_ids);
        setRisks((rows) => rows.map((row) => row.id === editingId ? { ...saved, inventory_record_ids: links } : row));
      } else {
        const created = await dbStore.createPrivacyRisk(orgId, form);
        setRisks((rows) => [created, ...rows]);
      }
      reset();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function remove(risk) {
    if (!window.confirm(`Delete risk "${risk.title}"?`)) return;
    setSaving(true); setError('');
    try { await dbStore.deletePrivacyRisk(orgId, risk.id); setRisks((rows) => rows.filter((row) => row.id !== risk.id)); if (editingId === risk.id) reset(); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  if (loading) return <State title="Loading privacy risks" detail="Fetching the organisation risk register." />;
  const formScore = Number(form.likelihood) * Number(form.impact);
  return <div className="space-y-5">
    <header className="border-b border-slate-800 pb-5"><p className="text-xs font-semibold uppercase text-rose-400">Privacy Operations</p><h2 className="mt-1 text-2xl font-semibold text-white">Privacy Risk Register</h2><p className="mt-1 text-sm text-slate-400">Assess, treat, review, and connect risks to processing records.</p></header>
    {error && <Error message={error} retry={load} />}
    <form onSubmit={submit} className="space-y-3 rounded-md border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between"><h3 className="font-semibold text-white">{editingId ? 'Edit privacy risk' : 'Register privacy risk'}</h3><div className="flex items-center gap-3"><span className="text-sm font-semibold text-amber-400">Score {formScore}/25</span>{editingId && <button type="button" onClick={reset} className="text-sm text-slate-400">Cancel</button>}</div></div>
      <div className="grid gap-3 md:grid-cols-3"><Field label="Risk title"><input required minLength={3} maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} /></Field><Select label="Category" value={form.category} values={categories} onChange={(value) => setForm({ ...form, category: value })} /><Field label="Owner"><input maxLength={120} value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className={inputClass} /></Field></div>
      <Field label="Description"><textarea required minLength={3} maxLength={2000} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} /></Field>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Select label="Likelihood" value={String(form.likelihood)} values={['1', '2', '3', '4', '5']} onChange={(value) => setForm({ ...form, likelihood: Number(value) })} /><Select label="Impact" value={String(form.impact)} values={['1', '2', '3', '4', '5']} onChange={(value) => setForm({ ...form, impact: Number(value) })} /><Select label="Status" value={form.status} values={['Open', 'Treating', 'Accepted', 'Closed']} onChange={(value) => setForm({ ...form, status: value })} /><Field label="Review date"><input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} className={inputClass} /></Field><button disabled={saving || !orgId} className="self-end rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50">{editingId ? 'Save risk' : 'Add risk'}</button></div>
      <Field label="Treatment plan"><textarea maxLength={3000} rows={2} value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} className={inputClass} /></Field>
      <fieldset><legend className="mb-2 text-xs text-slate-400">Linked inventory records</legend>{!inventory.length ? <p className="text-sm text-slate-500">No inventory records are available to link.</p> : <div className="flex flex-wrap gap-2">{inventory.map((record) => <label key={record.id} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${form.inventory_record_ids.includes(record.id) ? 'border-blue-500 bg-blue-500/10 text-blue-200' : 'border-slate-700 text-slate-400'}`}><input type="checkbox" checked={form.inventory_record_ids.includes(record.id)} onChange={() => toggleInventory(record.id)} />{record.record_name}</label>)}</div>}</fieldset>
    </form>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><input type="search" aria-label="Search risks" placeholder="Search risks..." value={search} onChange={(e) => setSearch(e.target.value)} className={inputClass} /><select aria-label="Filter risk status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>{['All', 'Open', 'Treating', 'Accepted', 'Closed'].map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Filter risk category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClass}>{['All', ...categories].map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Sort risks" value={sort} onChange={(e) => setSort(e.target.value)} className={inputClass}><option value="score_desc">Highest score</option><option value="title_asc">Title A-Z</option><option value="review_asc">Review date</option></select></div>
    {!visible.length ? <State title="No privacy risks" detail={risks.length ? 'No risks match the current search and filters.' : 'Register the first privacy risk for this organisation.'} /> : <div className="space-y-2">{visible.map((risk) => <article key={risk.id} className="grid gap-3 rounded-md border border-slate-800 bg-slate-900/40 p-4 lg:grid-cols-[80px_1fr_auto] lg:items-center"><div className={`flex h-14 w-14 items-center justify-center rounded-md text-lg font-bold ${risk.inherent_score >= 16 ? 'bg-rose-500/20 text-rose-300' : risk.inherent_score >= 9 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{risk.inherent_score}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-white">{risk.title}</h3><span className="text-xs text-slate-500">{risk.category} / {risk.status}</span></div><p className="mt-1 text-sm text-slate-400">{risk.description}</p><p className="mt-2 text-xs text-slate-500">Owner: {risk.owner_name || 'Unassigned'} | Review: {risk.review_date || 'Not set'} | Linked records: {risk.inventory_record_ids?.length || 0}</p></div><div className="flex gap-3"><button onClick={() => edit(risk)} className="text-sm text-blue-400">Edit</button><button disabled={saving} onClick={() => remove(risk)} className="text-sm text-rose-400">Delete</button></div></article>)}</div>}
  </div>;
}

function Field({ label, children }) { return <label className="block text-xs text-slate-400"><span className="mb-1 block">{label}</span>{children}</label>; }
function Select({ label, value, values, onChange }) { return <Field label={label}><select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>{values.map((item) => <option key={item}>{item}</option>)}</select></Field>; }
function State({ title, detail }) { return <div className="rounded-md border border-dashed border-slate-700 p-8 text-center"><p className="font-medium text-slate-200">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>; }
function Error({ message, retry }) { return <div role="alert" className="flex justify-between gap-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><span>{message}</span><button onClick={retry} className="font-semibold text-white">Retry</button></div>; }
