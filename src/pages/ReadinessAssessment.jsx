import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import dbStore from '../utils/dbStore';
import { resolveCurrentOrganisationId } from '../utils/currentOrganisation';
import { calculateReadiness, readinessControls } from '../config/readinessControls';

const button = 'rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

export default function ReadinessAssessment() {
  const [orgId, setOrgId] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [newTitle, setNewTitle] = useState('DPDP Readiness Assessment');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const activeOrgId = await resolveCurrentOrganisationId();
      const rows = await dbStore.listReadinessAssessments(activeOrgId);
      setOrgId(activeOrgId); setAssessments(rows);
      setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id || null);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const selected = assessments.find((assessment) => assessment.id === selectedId);
    setDraft(selected ? { ...selected, answers: { ...(selected.answers || {}) } } : null);
  }, [assessments, selectedId]);

  const metrics = useMemo(() => calculateReadiness(draft?.answers || {}), [draft]);

  async function createAssessment(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const created = await dbStore.createReadinessAssessment(orgId, { title: newTitle });
      setAssessments((rows) => [created, ...rows]); setSelectedId(created.id);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function saveAssessment(completed) {
    if (completed && metrics.answered !== readinessControls.length) {
      setError('Answer every control before completing the assessment.'); return;
    }
    setSaving(true); setError('');
    try {
      const saved = await dbStore.updateReadinessAssessment(orgId, draft.id, {
        title: draft.title, answers: draft.answers, score: metrics.score, risk_level: metrics.riskLevel,
        status: completed ? 'Completed' : metrics.answered ? 'In Progress' : 'Draft',
        completed_at: completed ? new Date().toISOString() : null,
      });
      setAssessments((rows) => rows.map((row) => row.id === saved.id ? saved : row));
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function removeAssessment() {
    if (!window.confirm('Delete this assessment and its linked action items?')) return;
    setSaving(true); setError('');
    try {
      await dbStore.deleteReadinessAssessment(orgId, draft.id);
      setAssessments((rows) => rows.filter((row) => row.id !== draft.id)); setSelectedId(null);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  if (loading) return <StatePanel title="Loading readiness assessments" detail="Fetching your organisation's control records." />;

  return <div className="space-y-5">
    <header className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase text-blue-400">Core Privacy Operations</p><h2 className="mt-1 text-2xl font-semibold text-white">Readiness Assessment</h2><p className="mt-1 text-sm text-slate-400">Evidence-oriented DPDP control reviews for the active organisation.</p></div>
      <Link to="/action-plan" className={`${button} border border-slate-700 text-slate-200 hover:bg-slate-800`}>Open action plan</Link>
    </header>
    {error && <ErrorBanner message={error} onRetry={load} />}
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-3 border-slate-800 xl:border-r xl:pr-5">
        <form onSubmit={createAssessment} className="space-y-2">
          <label className="text-xs font-medium text-slate-400" htmlFor="assessment-title">New assessment</label>
          <input id="assessment-title" value={newTitle} maxLength={120} onChange={(event) => setNewTitle(event.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
          <button disabled={saving || !orgId} className={`${button} w-full bg-blue-600 text-white hover:bg-blue-500`}>Create assessment</button>
        </form>
        <div className="space-y-1 pt-2">{assessments.map((assessment) => <button key={assessment.id} onClick={() => setSelectedId(assessment.id)} className={`w-full rounded-md border px-3 py-3 text-left ${selectedId === assessment.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}><span className="block truncate text-sm font-medium text-white">{assessment.title}</span><span className="mt-1 flex justify-between text-xs text-slate-500"><span>{assessment.status}</span><span>{assessment.score ?? 0}%</span></span></button>)}</div>
      </aside>
      {!draft ? <StatePanel title="No readiness assessments" detail="Create the first assessment to establish your organisation's baseline." /> : <section className="min-w-0 space-y-5">
        <div className="grid gap-3 sm:grid-cols-4"><Metric label="Score" value={`${metrics.score}%`} /><Metric label="Risk" value={metrics.riskLevel} /><Metric label="Answered" value={`${metrics.answered}/${readinessControls.length}`} /><Metric label="Status" value={draft.status} /></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><input aria-label="Assessment title" value={draft.title} maxLength={120} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-white outline-none focus:border-blue-500" /><button disabled={saving} onClick={() => saveAssessment(false)} className={`${button} border border-slate-700 text-slate-200 hover:bg-slate-800`}>Save draft</button><button disabled={saving} onClick={() => saveAssessment(true)} className={`${button} bg-emerald-600 text-white hover:bg-emerald-500`}>Complete</button><button disabled={saving} onClick={removeAssessment} className={`${button} text-rose-400 hover:bg-rose-500/10`}>Delete</button></div>
        <div className="divide-y divide-slate-800 border-y border-slate-800">{readinessControls.map((control, index) => <div key={control.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs text-slate-500">{index + 1}. {control.category}</p><p className="mt-1 text-sm text-slate-200">{control.question}</p>{draft.answers[control.id] === false && <p className="mt-1 text-xs text-amber-400">Action: {control.action}</p>}</div><div className="inline-flex h-9 rounded-md border border-slate-700 p-1">{[true, false].map((value) => <button key={String(value)} onClick={() => setDraft({ ...draft, answers: { ...draft.answers, [control.id]: value } })} className={`w-14 rounded px-2 text-xs font-semibold ${draft.answers[control.id] === value ? value ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>{value ? 'Yes' : 'No'}</button>)}</div></div>)}</div>
      </section>}
    </div>
  </div>;
}

function Metric({ label, value }) { return <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 truncate text-lg font-semibold text-white">{value}</p></div>; }
function StatePanel({ title, detail }) { return <div className="rounded-md border border-dashed border-slate-700 p-8 text-center"><p className="font-medium text-slate-200">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>; }
function ErrorBanner({ message, onRetry }) { return <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><span>{message}</span><button onClick={onRetry} className="font-semibold text-white">Retry</button></div>; }
