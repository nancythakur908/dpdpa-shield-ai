import { adminClient, json, options } from '../_shared/security.ts';
import { sendEmail } from '../_shared/email.ts';
const authorised = (request: Request) => request.headers.get('Authorization') === `Bearer ${Deno.env.get('CRON_SECRET')}`;
Deno.serve(async (request) => { const preflight = options(request); if (preflight) return preflight; if (!authorised(request)) return json({ error: 'Unauthorised.' }, 401); try {
  const admin = adminClient(); const today = new Date().toISOString().slice(0, 10);
  const { data: tasks, error } = await admin.from('compliance_tasks').select('id,organisation_id,title,due_date,priority,owner_name').in('status', ['Open','In Progress']).lte('due_date', today);
  if (error) throw error; let created = 0;
  for (const task of tasks || []) {
    const title = `Compliance task due: ${task.title}`; const body = `Due ${task.due_date}. Priority: ${task.priority}. Owner: ${task.owner_name || 'Unassigned'}.`;
    const { error: insertError } = await admin.from('app_notifications').insert({ organisation_id: task.organisation_id, title, body, type: 'Reminder', related_module: 'compliance_tasks', related_record_id: task.id }); if (!insertError) created++;
    const { data: recipients } = await admin.from('organisation_memberships').select('user_profiles(email)').eq('organisation_id', task.organisation_id).eq('is_active', true).in('role', ['Organisation Owner','Privacy Admin','Privacy Lead']);
    await Promise.all((recipients || []).map((recipient: { user_profiles?: { email?: string } | null }) => recipient.user_profiles?.email ? sendEmail(recipient.user_profiles.email, title, body).catch(() => null) : null));
  }
  return json({ processed: tasks?.length || 0, notificationsCreated: created });
} catch (error) { return json({ error: error.message || 'Reminder job failed.' }, 500); } });
