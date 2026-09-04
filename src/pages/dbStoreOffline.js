/**
 * PrivSecure India — Offline Test Implementation of the DB Service Layer
 * Used ONLY by unit tests. Does NOT import Supabase or make network calls.
 * Uses the postgresSimulator as a relational engine.
 */

import simulator from '../utils/postgresSimulator.js';
import { hasPermission } from '../utils/rbacConfig.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberships(email) {
  const matches = [];
  for (const [, m] of simulator.tables.organisation_memberships) {
    if (m.user_email === email) matches.push(m);
  }
  return matches;
}

function getUserRole(email, orgId) {
  for (const [, m] of simulator.tables.organisation_memberships) {
    if (m.organisation_id === orgId && m.user_email === email) return m.role;
  }
  return null;
}

function enforcePermission(email, orgId, permission) {
  const role = getUserRole(email, orgId);
  if (!role || !hasPermission(role, permission)) {
    throw new Error('Access denied. Insufficient permissions.');
  }
  return role;
}

function currentEmail() {
  return sessionStorage.getItem('privsecure_session_email');
}

function currentOrgId() {
  return sessionStorage.getItem('privsecure_current_org');
}

function appendAuditLog(email, orgId, action, module, result, description) {
  const logs = JSON.parse(localStorage.getItem('ps_audit_logs_v3') || '[]');
  const prevHash = logs.length > 0 ? logs[logs.length - 1].hash : '0000000000000000';
  const raw = `${prevHash}|${Date.now()}|${email}|${action}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) { h = Math.imul(31, h) + raw.charCodeAt(i) | 0; }
  const hash = Math.abs(h).toString(16);
  logs.push({ id: `AL-${Date.now()}`, organisation_id: orgId, actor_user_id: email, action, entity_type: module, result, hash, prevHash });
  localStorage.setItem('ps_audit_logs_v3', JSON.stringify(logs));
}

// ─── Exported offline dbStore (test-only) ────────────────────────────────────

export const dbStore = {

  signIn(email, password) {
    const user = simulator.tables.users.get(email);
    if (!user) throw new Error('Invalid email or password.');
    if (password !== 'demo-access') throw new Error('Invalid email or password.');
    sessionStorage.setItem('privsecure_session', '1');
    sessionStorage.setItem('privsecure_session_email', email);
    const memberships = getMemberships(email);
    if (memberships.length > 0) {
      sessionStorage.setItem('privsecure_current_org', memberships[0].organisation_id);
    }
    return user;
  },

  signOut() {
    sessionStorage.removeItem('privsecure_session');
    sessionStorage.removeItem('privsecure_session_email');
    sessionStorage.removeItem('privsecure_current_org');
  },

  getCurrentUser() {
    const email = currentEmail();
    if (!email) return null;
    return simulator.tables.users.get(email) || null;
  },

  getCurrentOrg() {
    const email = currentEmail();
    const orgId = currentOrgId();
    if (!email || !orgId) return null;
    const hasMembership = getMemberships(email).some(m => m.organisation_id === orgId);
    if (!hasMembership) throw new Error('Access denied. Relational tenant boundary validation failed.');
    return simulator.tables.organisations.get(orgId) || null;
  },

  setCurrentOrgId(orgId) {
    const email = currentEmail();
    if (!email) throw new Error('Unauthenticated.');
    const hasMembership = getMemberships(email).some(m => m.organisation_id === orgId);
    if (!hasMembership) throw new Error('Access denied. You do not belong to this organisation.');
    sessionStorage.setItem('privsecure_current_org', orgId);
  },

  updateOrg(orgId, fields) {
    const email = currentEmail();
    enforcePermission(email, orgId, 'settings.update');
    const org = simulator.tables.organisations.get(orgId);
    if (!org) throw new Error('Organisation not found.');
    simulator.tables.organisations.set(orgId, { ...org, ...fields });
    simulator.saveDatabase();
    appendAuditLog(email, orgId, 'Settings Update', 'Settings', 'Success', 'Updated org fields');
  },

  getOrgMembers(orgId) {
    const email = currentEmail();
    enforcePermission(email, orgId, 'members.view');
    const list = [];
    for (const [, m] of simulator.tables.organisation_memberships) {
      if (m.organisation_id === orgId) {
        const u = simulator.tables.users.get(m.user_email);
        if (u) list.push({ name: u.name, email: u.email, role: m.role });
      }
    }
    return list;
  },

  inviteMember(orgId, targetEmail, role) {
    const email = currentEmail();
    enforcePermission(email, orgId, 'members.invite');
    const mId = 'm_invite_' + Date.now();
    simulator.tables.organisation_memberships.set(mId, {
      id: mId, user_email: targetEmail, organisation_id: orgId, role,
    });
    simulator.saveDatabase();
  },

  removeMember(orgId, targetEmail) {
    const email = currentEmail();
    enforcePermission(email, orgId, 'members.remove');
    if (email === targetEmail) throw new Error('Self-removal is not allowed.');

    let targetKey = null, targetRole = null, ownerCount = 0;
    for (const [key, m] of simulator.tables.organisation_memberships) {
      if (m.organisation_id === orgId) {
        if (m.role === 'Organisation Owner') ownerCount++;
        if (m.user_email === targetEmail) { targetKey = key; targetRole = m.role; }
      }
    }
    if (!targetKey) throw new Error('Member not found.');
    if (targetRole === 'Organisation Owner' && ownerCount <= 1) {
      throw new Error('Cannot remove the only Organisation Owner.');
    }
    simulator.tables.organisation_memberships.delete(targetKey);
    simulator.saveDatabase();
  },

  getAuditLogs() {
    const email = currentEmail();
    const orgId = currentOrgId();
    enforcePermission(email, orgId, 'audit.view');
    const all = JSON.parse(localStorage.getItem('ps_audit_logs_v3') || '[]');
    return all.filter(l => l.organisation_id === orgId);
  },
};

export default dbStore;
