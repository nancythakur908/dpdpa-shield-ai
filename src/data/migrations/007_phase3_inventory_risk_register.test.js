import { readFileSync } from 'node:fs';
import { assert } from 'chai';

const migration = readFileSync(new URL('./007_phase3_inventory_risk_register.sql', import.meta.url), 'utf8');
const store = readFileSync(new URL('../../utils/dbStoreReal.js', import.meta.url), 'utf8');

function methodBody(name) {
  const start = store.indexOf(`async ${name}`);
  const end = store.indexOf('\n  async ', start + 8);
  assert.isAtLeast(start, 0, `${name} must exist`);
  return store.slice(start, end < 0 ? undefined : end);
}

describe('Phase 3 inventory and risk register security', () => {
  it('requires organisation ownership on inventory, risks, and links', () => {
    for (const table of ['data_inventory_records', 'privacy_risks', 'privacy_risk_inventory_links']) {
      assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}[\\s\\S]*?organisation_id UUID NOT NULL`));
    }
  });

  it('enforces role-specific mutation permissions', () => {
    const inventoryHelper = migration.slice(migration.indexOf('FUNCTION public.can_manage_data_inventory'), migration.indexOf('FUNCTION public.can_manage_privacy_risks'));
    const riskHelper = migration.slice(migration.indexOf('FUNCTION public.can_manage_privacy_risks'), migration.indexOf('REVOKE ALL ON FUNCTION public.can_manage_data_inventory'));
    assert.include(inventoryHelper, "'Department Owner'");
    assert.notInclude(riskHelper, "'Department Owner'");
    assert.include(riskHelper, "'Security Lead'");
    assert.include(migration, 'membership.user_id = auth.uid()');
  });

  it('prevents cross-organisation risk links at both foreign keys', () => {
    assert.match(migration, /FOREIGN KEY \(organisation_id, risk_id\)[\s\S]*REFERENCES public\.privacy_risks\(organisation_id, id\)/);
    assert.match(migration, /FOREIGN KEY \(organisation_id, inventory_record_id\)[\s\S]*REFERENCES public\.data_inventory_records\(organisation_id, id\)/);
  });

  it('scopes every production read and mutation by organisation_id', () => {
    const methods = [
      'listDataInventory', 'updateDataInventoryRecord', 'deleteDataInventoryRecord',
      'listPrivacyRisks', 'updatePrivacyRisk', 'replacePrivacyRiskLinks', 'deletePrivacyRisk',
    ];
    for (const method of methods) {
      assert.include(methodBody(method), ".eq('organisation_id', orgId)", `${method} must carry a tenant predicate`);
    }
    assert.include(methodBody('createDataInventoryRecord'), 'organisation_id: orgId');
    assert.include(methodBody('createPrivacyRisk'), 'organisation_id: orgId');
  });

  it('audits CRUD changes for inventory, risks, and links', () => {
    assert.include(migration, 'AFTER INSERT OR UPDATE OR DELETE ON public.data_inventory_records');
    assert.include(migration, 'AFTER INSERT OR UPDATE OR DELETE ON public.privacy_risks');
    assert.include(migration, 'AFTER INSERT OR DELETE ON public.privacy_risk_inventory_links');
    assert.include(migration, 'public.audit_privacy_operation()');
  });
});
