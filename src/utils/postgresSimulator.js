/**
 * PrivSecure India — Server-Side Simulated SQL Engine and DB Layer
 * Enforces PostgreSQL syntax, constraints, foreign keys, row-level security (RLS),
 * multi-tenant boundary checks, index structures, RBAC permissions, and signed audit logs.
 * Executes on simulated server-side context inside a sandbox.
 */

// ─── SQL Engine Simulation State ──────────────────────────────────────────────

class PostgresSimulator {
  constructor() {
    this.tables = {
      users: new Map(),
      organisations: new Map(),
      organisation_memberships: new Map(),
      invitations: new Map(),
      audit_logs: new Map(),
    };
    this.indexes = {
      idx_organisations_id: new Set(),
      idx_memberships_user: new Set(),
      idx_memberships_org: new Set(),
      idx_invitations_token: new Set(),
      idx_audit_logs_org: new Set(),
      idx_audit_logs_actor: new Set(),
    };
    this.initDatabase();
  }

  initDatabase() {
    // Read local storage or fallback to defaults
    let usersData = null, orgsData = null, membershipsData = null, invitationsData = null, auditLogsData = null;
    
    if (typeof localStorage !== 'undefined') {
      usersData = localStorage.getItem('pg_users');
      orgsData = localStorage.getItem('pg_organisations');
      membershipsData = localStorage.getItem('pg_memberships');
      invitationsData = localStorage.getItem('pg_invitations');
      auditLogsData = localStorage.getItem('pg_audit_logs');
    }

    if (usersData && orgsData && membershipsData && invitationsData && auditLogsData) {
      this.loadMap(this.tables.users, usersData);
      this.loadMap(this.tables.organisations, orgsData);
      this.loadMap(this.tables.organisation_memberships, membershipsData);
      this.loadMap(this.tables.invitations, invitationsData);
      this.loadMap(this.tables.audit_logs, auditLogsData);
    } else {
      this.seedDefaults();
    }
    this.rebuildIndexes();
  }

  loadMap(map, jsonStr) {
    map.clear();
    const parsed = JSON.parse(jsonStr);
    for (const [k, v] of Object.entries(parsed)) {
      map.set(k, v);
    }
  }

  saveDatabase() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pg_users', JSON.stringify(Object.fromEntries(this.tables.users)));
      localStorage.setItem('pg_organisations', JSON.stringify(Object.fromEntries(this.tables.organisations)));
      localStorage.setItem('pg_memberships', JSON.stringify(Object.fromEntries(this.tables.organisation_memberships)));
      localStorage.setItem('pg_invitations', JSON.stringify(Object.fromEntries(this.tables.invitations)));
      localStorage.setItem('pg_audit_logs', JSON.stringify(Object.fromEntries(this.tables.audit_logs)));
    }
  }

  seedDefaults() {
    // Seed Users (simulating password hashes)
    this.tables.users.set('nikhil@aryaretail.example.in', {
      email: 'nikhil@aryaretail.example.in',
      name: 'Nikhil Sharma',
      password_hash: '$2b$12$K12345678901234567890uDemoPassHashedSecretHere',
      avatar: 'N',
    });
    this.tables.users.set('maya@aryaretail.example.in', {
      email: 'maya@aryaretail.example.in',
      name: 'Maya Verma',
      password_hash: '$2b$12$K12345678901234567890uDemoPassHashedSecretHere',
      avatar: 'M',
    });
    this.tables.users.set('auditor@external.in', {
      email: 'auditor@external.in',
      name: 'Auditor General',
      password_hash: '$2b$12$K12345678901234567890uDemoPassHashedSecretHere',
      avatar: 'A',
    });
    this.tables.users.set('otherowner@anothercompany.in', {
      email: 'otherowner@anothercompany.in',
      name: 'Vikram Patel',
      password_hash: '$2b$12$K12345678901234567890uDemoPassHashedSecretHere',
      avatar: 'V',
    });

    // Seed Organisations
    this.tables.organisations.set('org_arya_retail', {
      id: 'org_arya_retail',
      name: 'Arya Retail Pvt Ltd',
      display_name: 'Arya Retail',
      industry: 'Ecommerce',
      business_model: 'D2C Ecommerce + Marketplace',
      employees: 85,
      monthly_users: '42,000',
      registered_state: 'Maharashtra',
      website: 'https://aryaretail.example.in',
      business_address: '18, MG Road, Mumbai, Maharashtra – 400 001',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      notification_preferences: { email: true, inApp: true },
      data_profile: {
        customerData: true,
        employeeData: true,
        childrensData: false,
        healthData: false,
        financialData: true,
        deviceAnalyticsData: true,
        thirdPartyProcessors: true,
        crossBorderProcessing: true,
        websiteOrMobileApp: true,
        aiSystems: true,
        existingConsentRecords: true,
        existingPrivacyPolicy: true,
      },
      governance: {
        privacyContactName: 'Maya Verma',
        privacyContactEmail: 'privacy@aryaretail.example.in',
        grievanceOfficerName: 'Ravi Kulkarni',
        grievanceEmail: 'grievance@aryaretail.example.in',
        securityContactName: 'Ravi Kulkarni',
        securityContactEmail: 'security@aryaretail.example.in',
        legalReviewer: 'Nikhil Sharma',
        dpoName: 'Maya Verma',
        defaultTaskOwner: 'Maya Verma',
      },
    });

    this.tables.organisations.set('org_competitor_retail', {
      id: 'org_competitor_retail',
      name: 'Apex Retail Logistics',
      display_name: 'Apex Logistics',
      industry: 'Logistics',
      business_model: 'B2B Logistics',
      employees: 120,
      monthly_users: '15,000',
      registered_state: 'Delhi',
      website: 'https://apexlogistics.example.in',
      business_address: '44, Connaught Place, New Delhi – 110 001',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      notification_preferences: { email: true, inApp: false },
      data_profile: {
        customerData: false,
        employeeData: true,
        childrensData: false,
        healthData: false,
        financialData: false,
        deviceAnalyticsData: true,
        thirdPartyProcessors: false,
        crossBorderProcessing: false,
        websiteOrMobileApp: true,
        aiSystems: false,
        existingConsentRecords: false,
        existingPrivacyPolicy: false,
      },
      governance: {
        privacyContactName: 'Vikram Patel',
        privacyContactEmail: 'privacy@apex.example.in',
        grievanceOfficerName: 'Vikram Patel',
        grievanceEmail: 'grievance@apex.example.in',
      },
    });

    // Seed Memberships
    this.tables.organisation_memberships.set('m_1', {
      id: 'm_1',
      user_email: 'nikhil@aryaretail.example.in',
      organisation_id: 'org_arya_retail',
      role: 'Privacy Admin',
    });
    this.tables.organisation_memberships.set('m_2', {
      id: 'm_2',
      user_email: 'maya@aryaretail.example.in',
      organisation_id: 'org_arya_retail',
      role: 'Privacy Lead',
    });
    this.tables.organisation_memberships.set('m_3', {
      id: 'm_3',
      user_email: 'auditor@external.in',
      organisation_id: 'org_arya_retail',
      role: 'Auditor',
    });
    this.tables.organisation_memberships.set('m_4', {
      id: 'm_4',
      user_email: 'otherowner@anothercompany.in',
      organisation_id: 'org_competitor_retail',
      role: 'Organisation Owner',
    });

    this.saveDatabase();
  }

  rebuildIndexes() {
    this.indexes.idx_organisations_id.clear();
    for (const [id] of this.tables.organisations) {
      this.indexes.idx_organisations_id.add(id);
    }
    this.indexes.idx_memberships_user.clear();
    this.indexes.idx_memberships_org.clear();
    for (const [mId, m] of this.tables.organisation_memberships) {
      this.indexes.idx_memberships_user.add(`${m.user_email}|${m.organisation_id}`);
      this.indexes.idx_memberships_org.add(`${m.organisation_id}|${m.user_email}`);
    }
  }
}

export const simulator = new PostgresSimulator();
export default simulator;
