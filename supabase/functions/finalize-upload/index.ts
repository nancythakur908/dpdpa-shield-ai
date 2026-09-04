import { assertActiveMembership, authenticatedUser, json, options } from '../_shared/security.ts';
const signatures: Record<string, number[]> = { 'application/pdf': [37,80,68,70], 'image/png': [137,80,78,71,13,10,26,10], 'image/jpeg': [255,216,255] };
const matches = (bytes: Uint8Array, type: string) => !signatures[type] || signatures[type].every((byte, i) => bytes[i] === byte);
const base64 = (bytes: Uint8Array) => { let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); };
Deno.serve(async (request) => { const preflight = options(request); if (preflight) return preflight; try {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const { fileId } = await request.json(); const { admin, user } = await authenticatedUser(request);
  const { data: file, error } = await admin.from('uploaded_files').select('*').eq('id', fileId).maybeSingle(); if (error || !file) throw new Error('File not found.');
  await assertActiveMembership(admin, file.organisation_id, user.id); if (file.created_by !== user.id) throw new Error('Only the uploader can finalise this file.');
  await admin.from('uploaded_files').update({ status: 'Scanning' }).eq('id', file.id);
  const { data: blob, error: downloadError } = await admin.storage.from('privsecure-quarantine').download(file.storage_path); if (downloadError || !blob) throw new Error('Quarantined upload was not found.');
  const bytes = new Uint8Array(await blob.arrayBuffer()); if (bytes.byteLength !== file.size_bytes || !matches(bytes, file.content_type)) { await admin.from('uploaded_files').update({ status: 'Rejected', scan_result: { reason: 'File type validation failed' } }).eq('id', file.id); throw new Error('File type validation failed.'); }
  const scannerUrl = Deno.env.get('FILE_SCANNER_WEBHOOK_URL'); if (!scannerUrl) { await admin.from('uploaded_files').update({ status: 'Rejected', scan_result: { reason: 'Scanner unavailable' } }).eq('id', file.id); throw new Error('File scanning is not configured.'); }
  const scan = await fetch(scannerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('FILE_SCANNER_TOKEN') || ''}` }, body: JSON.stringify({ file_name: file.original_name, content_type: file.content_type, file_base64: base64(bytes) }) });
  const result = await scan.json(); if (!scan.ok || result.clean !== true) { await admin.from('uploaded_files').update({ status: 'Rejected', scan_provider: 'webhook', scan_result: result }).eq('id', file.id); throw new Error('File scanner did not approve this file.'); }
  const { error: uploadError } = await admin.storage.from('privsecure-documents').upload(file.storage_path, bytes, { contentType: file.content_type, upsert: false }); if (uploadError) throw uploadError;
  await admin.storage.from('privsecure-quarantine').remove([file.storage_path]);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map((b) => b.toString(16).padStart(2, '0')).join('');
  await admin.from('uploaded_files').update({ status: 'Clean', sha256: hash, scan_provider: 'webhook', scan_result: result, scanned_at: new Date().toISOString() }).eq('id', file.id);
  return json({ fileId: file.id, status: 'Clean' });
} catch (error) { return json({ error: error.message || 'File validation failed.' }, 400); } });
