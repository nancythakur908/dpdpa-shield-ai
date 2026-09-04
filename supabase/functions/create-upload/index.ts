import { assertActiveMembership, authenticatedUser, json, options } from '../_shared/security.ts';
const allowed = new Set(['application/pdf', 'image/png', 'image/jpeg', 'text/plain']);
const safeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
Deno.serve(async (request) => { const preflight = options(request); if (preflight) return preflight; try {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const { organisationId, fileName, contentType, sizeBytes, relatedModule, relatedRecordId } = await request.json();
  if (!organisationId || !fileName || !allowed.has(contentType) || !Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > 10485760) return json({ error: 'Invalid file metadata.' }, 400);
  const { admin, user } = await authenticatedUser(request); await assertActiveMembership(admin, organisationId, user.id);
  const id = crypto.randomUUID(); const path = `${organisationId}/${id}/${safeName(fileName)}`;
  const { error: rowError } = await admin.from('uploaded_files').insert({ id, organisation_id: organisationId, created_by: user.id, original_name: safeName(fileName), content_type: contentType, size_bytes: sizeBytes, storage_path: path, related_module: relatedModule || null, related_record_id: relatedRecordId || null, status: 'PendingUpload' });
  if (rowError) throw rowError;
  const { data, error } = await admin.storage.from('privsecure-quarantine').createSignedUploadUrl(path); if (error) throw error;
  await admin.from('uploaded_files').update({ status: 'Quarantined' }).eq('id', id).eq('organisation_id', organisationId);
  return json({ fileId: id, path, token: data.token, signedUrl: data.signedUrl });
} catch (error) { return json({ error: error.message || 'Upload could not be prepared.' }, 400); } });
