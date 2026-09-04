import { readFileSync } from 'node:fs';
import { assert } from 'chai';

const sql = readFileSync(
  new URL('./003_fix_audit_and_membership_security.sql', import.meta.url),
  'utf8',
);

describe('Migration 003 audit and membership security', () => {
  it('rejects self-promotion before executing a membership mutation', () => {
    const guard = sql.indexOf("v_actor_id = p_target_user_id AND p_action IN ('change_role', 'invite')");
    const mutation = sql.indexOf("IF p_action = 'invite' THEN", guard);
    assert.isAtLeast(guard, 0);
    assert.isAbove(mutation, guard);
  });

  it('rejects cross-organisation audit and membership operations', () => {
    assert.include(sql, 'Cross-organisation audit write rejected.');
    assert.include(sql, 'Cross-organisation membership modification rejected.');
    assert.match(sql, /membership\.organisation_id = p_org_id[\s\S]*membership\.user_id = v_actor_id/);
  });

  it('locks owners and protects the last active Organisation Owner', () => {
    assert.match(sql, /owner_membership\.role = 'Organisation Owner'[\s\S]*FOR UPDATE;/);
    assert.include(sql, 'Cannot remove, deactivate, or demote the last Organisation Owner.');
  });

  it('creates an audit row inside every successful membership transaction', () => {
    const mutation = sql.indexOf("IF p_action = 'invite' THEN");
    const audit = sql.indexOf('PERFORM public.insert_audit_log(', mutation);
    const returned = sql.indexOf("RETURN jsonb_build_object('success'", mutation);
    assert.isAbove(audit, mutation);
    assert.isAbove(returned, audit);
  });

  it('derives actor identity and rejects a forged actor claim', () => {
    assert.include(sql, 'v_actor_id UUID := auth.uid()');
    assert.include(sql, 'p_actor_user_id <> v_actor_id');
    assert.include(sql, 'Forged actor identity rejected.');
    assert.match(sql, /VALUES \(\s*p_organisation_id, v_actor_id, v_actor_email/);
  });

  it('limits audit execution and sensitive metadata', () => {
    assert.include(sql, 'FROM PUBLIC;');
    assert.include(sql, 'FROM anon;');
    assert.include(sql, 'TO authenticated;');
    assert.include(sql, 'Sensitive audit metadata is not permitted.');
    assert.include(sql, 'Nested or record-shaped audit metadata is not permitted.');
  });
});
