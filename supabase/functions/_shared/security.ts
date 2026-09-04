import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = { 'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '', 'Access-Control-Allow-Headers': 'authorization, content-type' };
export function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
export function adminClient() { return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!); }
export async function authenticatedUser(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Unauthenticated request.');
  const admin = adminClient(); const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid session.');
  return { admin, user: data.user };
}
export async function assertActiveMembership(admin: ReturnType<typeof adminClient>, organisationId: string, userId: string) {
  const { data, error } = await admin.from('organisation_memberships').select('role').eq('organisation_id', organisationId).eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (error || !data) throw new Error('You are not an active member of this organisation.');
  return data;
}
export function options(request: Request) { return request.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null; }
