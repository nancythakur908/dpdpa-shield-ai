import { assertActiveMembership, authenticatedUser, json, options } from '../_shared/security.ts';
Deno.serve(async (request) => { const preflight = options(request); if (preflight) return preflight; try {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const { organisationId, question } = await request.json(); if (!organisationId || typeof question !== 'string' || !question.trim() || question.length > 4000) return json({ error: 'Invalid question.' }, 400);
  const { admin, user } = await authenticatedUser(request); await assertActiveMembership(admin, organisationId, user.id);
  const [{ data: risks }, { data: tasks }, { data: vendors }] = await Promise.all([
    admin.from('privacy_risks').select('title,status,risk_score').eq('organisation_id', organisationId).neq('status', 'Closed').order('risk_score', { ascending: false }).limit(10),
    admin.from('compliance_tasks').select('title,due_date,status,priority').eq('organisation_id', organisationId).not('status', 'in', '(Completed,Cancelled)').order('due_date').limit(10),
    admin.from('vendors').select('name,risk_score,lifecycle_status').eq('organisation_id', organisationId).order('risk_score', { ascending: false }).limit(10),
  ]);
  const apiKey = Deno.env.get('OPENAI_API_KEY'); if (!apiKey) throw new Error('AI service is not configured.');
  const context = JSON.stringify({ open_risks: risks || [], open_tasks: tasks || [], vendors: vendors || [] });
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini', input: [{ role: 'system', content: 'You are a DPDP operations assistant. Use only the supplied tenant-scoped context. Do not provide legal advice; clearly state when professional review is needed.' }, { role: 'user', content: `Workspace context: ${context}\n\nQuestion: ${question.trim()}` }], max_output_tokens: 700 }) });
  const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message || 'AI provider request failed.');
  const answer = payload.output_text?.trim(); if (!answer) throw new Error('AI provider returned no answer.');
  return json({ answer, contextSnapshot: { source: 'tenant-scoped-server-context' } });
} catch (error) { return json({ error: error.message || 'AI request failed.' }, 400); } });
