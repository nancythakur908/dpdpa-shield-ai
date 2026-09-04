import { readFileSync } from 'node:fs';
import { assert } from 'chai';

const migration = readFileSync(new URL('./008_phase3_vendor_rights_requests.sql', import.meta.url), 'utf8');
const store = readFileSync(new URL('../../utils/dbStoreReal.js', import.meta.url), 'utf8');

function method(name) {
  const start = store.indexOf(`async ${name}`);
  const end = store.indexOf('\n  async ', start + 8);
  assert.isAtLeast(start, 0, `${name} must exist`);
  return store.slice(start, end < 0 ? undefined : end);
}

describe('Phase 3 vendor and rights-request security', () => {
  it('requires organisation_id and same-tenant child relationships', () => {
    for (const table of ['vendors', 'vendor_evidence', 'data_principal_requests', 'rights_request_events']) {
      assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}[\\s\\S]*?organisation_id UUID NOT NULL`));
    }
    assert.match(migration, /FOREIGN KEY \(organisation_id, vendor_id\)[\s\S]*REFERENCES public\.vendors\(organisation_id, id\)/);
    assert.match(migration, /FOREIGN KEY \(organisation_id, request_id\)[\s\S]*REFERENCES public\.data_principal_requests\(organisation_id, id\)/);
  });

  it('enforces vendor and rights role permissions from auth.uid()', () => {
    assert.include(migration, 'FUNCTION public.can_manage_vendor_risk');
    assert.include(migration, 'FUNCTION public.can_manage_rights_requests');
    assert.include(migration, 'm.user_id = auth.uid()');
    assert.include(migration, "'Security Lead'");
    assert.include(migration, "'Legal Reviewer'");
  });

  it('keeps anonymous intake behind a constrained RPC', () => {
    assert.include(migration, 'FUNCTION public.submit_data_principal_request');
    assert.include(migration, 'GRANT EXECUTE ON FUNCTION public.submit_data_principal_request(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated');
    assert.notMatch(migration, /CREATE POLICY[^;]+data_principal_requests[^;]+TO anon/);
    assert.notInclude(method('submitDataPrincipalRequest'), 'actor_user_id');
  });

  it('scopes internal CRUD and workflow operations by organisation', () => {
    for (const name of ['listVendors', 'updateVendor', 'deleteVendor', 'listVendorEvidence', 'updateVendorEvidence', 'deleteVendorEvidence', 'listRightsRequests', 'listRightsRequestEvents', 'updateRightsRequest', 'deleteRightsRequest']) {
      assert.include(method(name), ".eq('organisation_id', orgId)", `${name} must carry organisation_id`);
    }
    assert.include(migration, 'organisation_id is immutable.');
  });

  it('audits vendors, evidence, requests, and timeline events', () => {
    for (const table of ['vendors', 'vendor_evidence', 'data_principal_requests', 'rights_request_events']) {
      assert.match(migration, new RegExp(`audit_[a-z_]+[^;]+ON public\\.${table}`));
    }
  });
});
