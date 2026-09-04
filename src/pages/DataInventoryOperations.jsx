import { useCallback, useEffect, useMemo, useState } from 'react';
import dbStore from '../utils/dbStore';
import { resolveCurrentOrganisationId } from '../utils/currentOrganisation';

const initialForm = { record_name: '', data_category: '', data_subjects: '', processing_purpose: '', lawful_basis: 'Consent', systems: '', storage_locations: '', retention_period: '', sensitivity: 'Medium', owner_name: '', status: 'Active' };
const inputClass = 'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500';
const commaList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

export default function DataInventoryOperations() {
  const [orgId, setOrgId] = useState(null);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [sensitivity, setSensitivity] = useState('All');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('updated_desc');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const activeOrgId = await resolveCurrentOrganisationId();
      setOrgId(activeOrgId); setRecords(await dbStore.listDataInventory(activeOrgId));
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !query || [record.record_name, record.data_category, record.processing_purpose, record.owner_name, ...(record.systems || [])].some((value) => value?.toLowerCase().includes(query));
      return matchesSearch && (sensitivity === 'All' || record.sensitivity === sensitivity) && (status === 'All' || record.status === status);
    }).sort((left, right) => {
      if (sort === 'name_asc') return left.record_name.localeCompare(right.record_name);
      if (sort === 'sensitivity_desc') return ['Low', 'Medium', 'High', 'Restricted'].indexOf(right.sensitivity) - ['Low', 'Medium', 'High', 'Restricted'].indexOf(left.sensitivity);
      return new Date(right.updated_at) - new Date(left.updated_at);
    });
  }, [records, search, sensitivity, status, sort]);

  function resetForm() { setForm(initialForm); setEditingId(null); }
  function editRecord(record) {
    setEditingId(record.id);
    setForm({ ...record, data_subjects: (record.data_subjects || []).join(', '), systems: (record.systems || []).join(', '), storage_locations: (record.storage_locations || []).join(', ') });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    const payload = { ...form, data_subjects: commaList(form.data_subjects), systems: commaList(form.systems), storage_locations: commaList(form.storage_locations) };
    try {
      if (editingId) {
        const saved = await dbStore.updateDataInventoryRecord(orgId, editingId, payload);
        setRecords((rows) => rows.map((row) => row.id === saved.id ? saved : row));
      } else {
        const created = await dbStore.createDataInventoryRecord(orgId, payload);
        setRecords((rows) => [created, ...rows]);
      }
      resetForm();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function remove(record) {
    if (!window.confirm(`Delete "${record.record_name}"? Linked risk references will also be removed.`)) return;
    setSaving(true); setError('');
    try { await dbStore.deleteDataInventoryRecord(orgId, record.id); setRecords((rows) => rows.filter((row) => row.id !== record.id)); if (editingId === record.id) resetForm(); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  if (loading) return <State title="Loading data inventory" detail="Fetching organisation processing records." />;
  return <div className="space-y-5">
    <header className="border-b border-slate-800 pb-5"><p className="text-xs font-semibold uppercase text-blue-400">Data Governance</p><h2 className="mt-1 text-2xl font-semibold text-white">Data Inventory</h2><p className="mt-1 text-sm text-slate-400">Maintain purposes, systems, retention, sensitivity, and accountable owners.</p></header>
    {error && <Error message={error} retry={load} />}
    <form onSubmit={submit} className="space-y-3 rounded-md border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between"><h3 className="font-semibold text-white">{editingId ? 'Edit inventory record' : 'Add inventory record'}</h3>{editingId && <button type="button" onClick={resetForm} className="text-sm text-slate-400 hover:text-white">Cancel</button>}</div>
      <div className="grid gap-3 md:grid-cols-3"><Field label="Record name"><input required minLength={3} maxLength={160} value={form.record_name} onChange={(e) => setForm({ ...form, record_name: e.target.value })} className={inputClass} /></Field><Field label="Data category"><input required minLength={2} maxLength={100} value={form.data_category} onChange={(e) => setForm({ ...form, data_category: e.target.value })} className={inputClass} /></Field><Field label="Owner"><input maxLength={120} value={form.owner_name || ''} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className={inputClass} /></Field></div>
      <Field label="Processing purpose"><textarea required minLength={3} maxLength={1000} rows={2} value={form.processing_purpose} onChange={(e) => setForm({ ...form, processing_purpose: e.target.value })} className={inputClass} /></Field>
      <div className="grid gap-3 md:grid-cols-3"><Field label="Data subjects (comma-separated)"><input value={form.data_subjects} onChange={(e) => setForm({ ...form, data_subjects: e.target.value })} className={inputClass} /></Field><Field label="Systems (comma-separated)"><input value={form.systems} onChange={(e) => setForm({ ...form, systems: e.target.value })} className={inputClass} /></Field><Field label="Storage locations (comma-separated)"><input value={form.storage_locations} onChange={(e) => setForm({ ...form, storage_locations: e.target.value })} className={inputClass} /></Field></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Select label="Lawful basis" value={form.lawful_basis} values={['Consent', 'Legitimate Use', 'Legal Obligation', 'Employment', 'Emergency', 'Other']} onChange={(value) => setForm({ ...form, lawful_basis: value })} /><Field label="Retention period"><input maxLength={240} value={form.retention_period || ''} onChange={(e) => setForm({ ...form, retention_period: e.target.value })} className={inputClass} /></Field><Select label="Sensitivity" value={form.sensitivity} values={['Low', 'Medium', 'High', 'Restricted']} onChange={(value) => setForm({ ...form, sensitivity: value })} /><Select label="Status" value={form.status} values={['Draft', 'Active', 'Archived']} onChange={(value) => setForm({ ...form, status: value })} /><button disabled={saving || !orgId} className="self-end rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">{editingId ? 'Save changes' : 'Add record'}</button></div>
    </form>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><input type="search" aria-label="Search inventory" placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)} className={inputClass} /><select aria-label="Filter sensitivity" value={sensitivity} onChange={(e) => setSensitivity(e.target.value)} className={inputClass}>{['All', 'Low', 'Medium', 'High', 'Restricted'].map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>{['All', 'Draft', 'Active', 'Archived'].map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Sort inventory" value={sort} onChange={(e) => setSort(e.target.value)} className={inputClass}><option value="updated_desc">Recently updated</option><option value="name_asc">Name A-Z</option><option value="sensitivity_desc">Highest sensitivity</option></select></div>
    {!visible.length ? <State title="No inventory records" detail={records.length ? 'No records match the current search and filters.' : 'Add the first processing record for this organisation.'} /> : <div className="overflow-x-auto border-y border-slate-800"><table className="min-w-full text-left text-sm"><thead className="text-xs text-slate-500"><tr>{['Record', 'Purpose', 'Systems', 'Retention', 'Sensitivity', 'Status', 'Actions'].map((name) => <th key={name} className="px-3 py-3 font-medium">{name}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{visible.map((record) => <tr key={record.id}><td className="px-3 py-3"><p className="font-medium text-white">{record.record_name}</p><p className="text-xs text-slate-500">{record.data_category}</p></td><td className="max-w-xs px-3 py-3 text-slate-300">{record.processing_purpose}</td><td className="px-3 py-3 text-slate-400">{record.systems?.join(', ') || 'None'}</td><td className="px-3 py-3 text-slate-400">{record.retention_period || 'Not set'}</td><td className="px-3 py-3 text-slate-300">{record.sensitivity}</td><td className="px-3 py-3 text-slate-300">{record.status}</td><td className="whitespace-nowrap px-3 py-3"><button onClick={() => editRecord(record)} className="mr-3 text-blue-400">Edit</button><button disabled={saving} onClick={() => remove(record)} className="text-rose-400">Delete</button></td></tr>)}</tbody></table></div>}
  </div>;
}

function Field({ label, children }) { return <label className="block text-xs text-slate-400"><span className="mb-1 block">{label}</span>{children}</label>; }
function Select({ label, value, values, onChange }) { return <Field label={label}><select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>{values.map((item) => <option key={item}>{item}</option>)}</select></Field>; }
function State({ title, detail }) { return <div className="rounded-md border border-dashed border-slate-700 p-8 text-center"><p className="font-medium text-slate-200">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>; }
function Error({ message, retry }) { return <div role="alert" className="flex justify-between gap-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><span>{message}</span><button onClick={retry} className="font-semibold text-white">Retry</button></div>; }
