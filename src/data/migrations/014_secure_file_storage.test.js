import { readFileSync } from 'node:fs';
import { assert } from 'chai';

const sql = readFileSync(new URL('./014_secure_file_storage.sql', import.meta.url), 'utf8');

describe('Phase 8 secure file storage', () => {
  it('uses private buckets with strict type and size limits', () => {
    assert.include(sql, "'privsecure-quarantine'");
    assert.include(sql, "'privsecure-documents'");
    assert.include(sql, 'file_size_limit');
    assert.include(sql, '10485760');
  });
  it('keeps file metadata tenant-scoped and storage reads tenant-scoped', () => {
    assert.include(sql, 'organisation_id UUID NOT NULL');
    assert.include(sql, 'ENABLE ROW LEVEL SECURITY');
    assert.include(sql, 'public.is_active_org_member(f.organisation_id)');
  });
});
