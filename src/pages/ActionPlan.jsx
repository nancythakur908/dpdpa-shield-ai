import { useCallback, useEffect, useMemo, useState } from 'react';
import dbStore from '../utils/dbStore';
import { resolveCurrentOrganisationId } from '../utils/currentOrganisation';

const emptyForm = { title: '', description: '', priority: 'Medium', status: 'Open', due_date: '', owner_name: '', assessment_id: '' };
const field = 'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500';

export default function ActionPlan() {
  const [orgId, setOrgId] = useState(null);
  const [items, setItems] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const activeOrgId = await resolveCurrentOrganisationId();
      const [actionRows, assessmentRows] = await Promise.all([
        dbStore.listActionPlanItems(activeOrgId),
        dbStore.listReadinessAssessments(activeOrgId),
      ]);
      setOrgId(activeOrgId); setItems(actionRows); setAssessments(assessmentRows);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visibleItems = useMemo(
    () => filter === 'All' ? items : items.filter((item) => item.status === filter),
    [items, filter],
  );

  async function createItem(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const created = await dbStore.createActionPlanItem(orgId, form);
      const assessment = assessments.find((row) => row.id === created.assessment_id);
      setItems((rows) => [{ ...created, readiness_assessments: assessment || null }, ...rows]);
      setForm(emptyForm);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function updateItem(item, patch) {
    setSaving(true); setError('');
    try {
      const updated = await dbStore.updateActionPlanItem(orgId, item.id, patch);
      setItems((rows) => rows.map((row) => row.id === item.id ? { ...row, ...updated } : row));
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setSaving(true); setError('');
    try {
      await dbStore.deleteActionPlanItem(orgId, item.id);
      setItems((rows) => rows.filter((row) => row.id !== item.id));
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  if (loading) return <Panel title="Loading action plan" detail="Fetching organisation actions and assessment links." />;

  return <div className="space-y-5">
    <header className="border-b border-slate-800 pb-5"><p className="text-xs font-semibold uppercase text-emerald-400">Core Privacy Operations</p><h2 className="mt-1 text-2xl font-semibold text-white">Action Plan</h2><p className="mt-1 text-sm text-slate-400">Assign, prioritise, and close readiness gaps for the active organisation.</p></header>
    {error && <div role="alert" className="flex justify-between gap-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><span>{error}</span><button onClick={load} className="font-semibold text-white">Retry</button></div>}
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <form onSubmit={createItem} className="space-y-3 border-slate-800 xl:border-r xl:pr-6">
        <h3 className="font-semibold text-white">New action item</h3>
        <label className="block text-xs text-slate-400">Title<input required minLength={3} maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={`${field} mt-1`} /></label>
        <label className="block text-xs text-slate-400">Description<textarea maxLength={2000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${field} mt-1 resize-y`} /></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className={`${field} mt-1`}>{['Low', 'Medium', 'High', 'Critical'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-xs text-slate-400">Due date<input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} className={`${field} mt-1`} /></label></div>
        <label className="block text-xs text-slate-400">Owner<input maxLength={120} value={form.owner_name} onChange={(event) => setForm({ ...form, owner_name: event.target.value })} className={`${field} mt-1`} /></label>
        <label className="block text-xs text-slate-400">Linked assessment<select value={form.assessment_id} onChange={(event) => setForm({ ...form, assessment_id: event.target.value })} className={`${field} mt-1`}><option value="">None</option>{assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}</select></label>
        <button disabled={saving || !orgId} className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">Add action</button>
      </form>
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-400">{visibleItems.length} action{visibleItems.length === 1 ? '' : 's'}</p><div className="inline-flex flex-wrap rounded-md border border-slate-700 p-1">{['All', 'Open', 'In Progress', 'Blocked', 'Completed'].map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded px-2 py-1 text-xs ${filter === value ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>{value}</button>)}</div></div>
        {!visibleItems.length ? <Panel title="No action items" detail={filter === 'All' ? 'Add the first action for this organisation.' : `No items are currently ${filter.toLowerCase()}.`} /> : <div className="divide-y divide-slate-800 border-y border-slate-800">{visibleItems.map((item) => <article key={item.id} className="space-y-3 py-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-medium text-white">{item.title}</h3><p className="mt-1 text-sm text-slate-400">{item.description || 'No description'}</p>{item.readiness_assessments?.title && <p className="mt-1 text-xs text-blue-400">Assessment: {item.readiness_assessments.title}</p>}</div><button disabled={saving} onClick={() => deleteItem(item)} className="rounded p-2 text-sm text-rose-400 hover:bg-rose-500/10" aria-label={`Delete ${item.title}`}>Delete</button></div>
          <div className="grid gap-2 sm:grid-cols-4"><select aria-label="Status" value={item.status} disabled={saving} onChange={(event) => updateItem(item, { status: event.target.value })} className={field}>{['Open', 'In Progress', 'Blocked', 'Completed'].map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Priority" value={item.priority} disabled={saving} onChange={(event) => updateItem(item, { priority: event.target.value })} className={field}>{['Low', 'Medium', 'High', 'Critical'].map((value) => <option key={value}>{value}</option>)}</select><input key={`${item.id}-${item.owner_name || ''}`} aria-label="Owner" placeholder="Owner" defaultValue={item.owner_name || ''} disabled={saving} onBlur={(event) => { if (event.target.value !== (item.owner_name || '')) updateItem(item, { owner_name: event.target.value }); }} className={field} /><input aria-label="Due date" type="date" value={item.due_date || ''} disabled={saving} onChange={(event) => updateItem(item, { due_date: event.target.value || null })} className={field} /></div>
        </article>)}</div>}
      </section>
    </div>
  </div>;
}

function Panel({ title, detail }) {
  return <div className="rounded-md border border-dashed border-slate-700 p-8 text-center"><p className="font-medium text-slate-200">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>;
}
