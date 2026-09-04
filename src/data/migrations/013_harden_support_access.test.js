import { readFileSync } from 'node:fs';
import { assert } from 'chai';

const sql = readFileSync(new URL('./013_harden_support_access.sql', import.meta.url), 'utf8');
const store = readFileSync(new URL('../../utils/dbStoreReal.js', import.meta.url), 'utf8');

describe('Phase 7 support access hardening', () => {
  it('separates requester creation from support administration', () => {
    assert.include(sql, 'Ticket create by requester');
    assert.include(sql, 'requester_user_id = auth.uid()');
    assert.include(sql, 'Ticket administration');
    assert.include(sql, 'public.can_manage_support(organisation_id)');
  });

  it('prevents requesters from forging internal replies or activity evidence', () => {
    assert.match(sql, /is_internal = false/);
    assert.include(sql, 'Activity administration');
    assert.notInclude(store, "support_ticket_activity').insert");
  });

  it('also restricts attachments, feature workflow, and feedback to their owner or support admins', () => {
    for (const policy of ['Attachment create by participant or admin', 'Feature request administration', 'Feedback create by user']) assert.include(sql, policy);
  });
});
