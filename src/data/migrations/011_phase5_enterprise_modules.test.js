import { readFileSync } from 'node:fs';
import { assert } from 'chai';

const sql = readFileSync(new URL('./011_phase5_enterprise_modules.sql', import.meta.url), 'utf8');
const store = readFileSync(new URL('../../utils/dbStoreReal.js', import.meta.url), 'utf8');
function method(name) { const start = store.indexOf(`async ${name}`); const end = store.indexOf('\n  async ', start + 8); assert.isAtLeast(start, 0, `${name} exists`); return store.slice(start, end < 0 ? undefined : end); }

describe('Phase 5 enterprise module security', () => {
  it('creates tenant-owned enterprise tables with RLS', () => {
    for (const table of ['discovery_scans','discovery_findings','data_flow_maps','data_flow_nodes','data_flow_edges','cookie_domains','cookie_registry','app_notifications','ai_conversations','ai_messages']) {
      assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}[\\s\\S]*?organisation_id UUID NOT NULL`));
      assert.include(sql, 'ENABLE ROW LEVEL SECURITY');
    }
  });
  it('preserves same-organisation relationships for discovery, maps, cookies, and AI history', () => {
    for (const relation of ['FOREIGN KEY(organisation_id,scan_id)','FOREIGN KEY(organisation_id,map_id)','FOREIGN KEY(organisation_id,domain_id)','FOREIGN KEY(organisation_id,conversation_id)']) assert.include(sql, relation);
  });
  it('uses authenticated role checks and audits every enterprise mutation', () => {
    assert.include(sql, 'm.user_id=auth.uid()');
    assert.include(sql, 'audit_privacy_operation()');
    assert.include(sql, 'DROP POLICY IF EXISTS');
  });
  it('keeps client data methods scoped to the active organisation', () => {
    for (const name of ['listDiscoveryWorkspace','listDataFlowMaps','listCookieWorkspace','listNotifications','listAiConversation']) assert.include(method(name), ".eq('organisation_id', orgId)");
  });
});
