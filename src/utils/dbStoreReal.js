/**
 * PrivSecure India — Live Supabase Database Service Layer
 * All production data access goes through this module via real Supabase queries.
 * No localStorage, sessionStorage, or mock data.
 * Auth state managed by Supabase session (JWT, persisted in IndexedDB).
 */

import supabase from './supabaseClient.js';
import { hasPermission } from './rbacConfig.js';

function dbError(message) {
  console.error('[dbStore]', message);
  throw new Error(message);
}

function authError(error) {
  // Supabase may throw a browser/network error instead of returning an AuthError
  // when the configured project has been paused, deleted, or its URL is wrong.
  if (error instanceof TypeError || /fetch failed|network|failed to fetch/i.test(error?.message || '')) {
    return 'Authentication is unavailable because the configured Supabase project cannot be reached. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart the app.';
  }
  return error?.message || 'Authentication could not be completed. Please try again.';
}

function requireOrgId(orgId) {
  if (!orgId) dbError('Select an organisation before continuing.');
  return orgId;
}

async function requireUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) dbError('Unauthenticated.');
  return user;
}

async function writeAuditLog({ orgId, action, entityType, entityId, result, metadata }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.rpc('insert_audit_log', {
    p_organisation_id: orgId || null,
    p_actor_user_id:   user.id,
    p_actor_email:     user.email,
    p_action:          action,
    p_entity_type:     entityType || null,
    p_entity_id:       entityId ? String(entityId) : null,
    p_result:          result,
    p_metadata:        metadata || {},
  });
  if (error) console.warn('[audit]', error.message);
}

async function getCurrentUserRole(orgId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !orgId) return null;
  const { data, error } = await supabase
    .from('organisation_memberships')
    .select('role')
    .eq('organisation_id', orgId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();
  if (error || !data) return null;
  return data.role;
}

async function enforcePermission(orgId, permission) {
  const role = await getCurrentUserRole(orgId);
  if (!role || !hasPermission(role, permission)) {
    await writeAuditLog({ orgId, action: 'Permission Denied', entityType: 'RBAC', result: 'Denied', metadata: { permission, role } });
    dbError(`Access denied. Permission required: ${permission}`);
  }
  return role;
}

export const dbStore = {
  async signIn(email, password) {
    let data;
    let error;
    try {
      ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
    } catch (err) {
      dbError(authError(err));
    }
    if (error) {
      await writeAuditLog({ action: 'Login Failure', entityType: 'Auth', result: 'Failure', metadata: { email } });
      dbError(authError(error));
    }
    const { data: membership } = await supabase
      .from('organisation_memberships')
      .select('organisation_id')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (membership?.organisation_id) {
      sessionStorage.setItem('privsecure_current_org', membership.organisation_id);
    }
    await writeAuditLog({ action: 'Login', entityType: 'Auth', result: 'Success', metadata: { email } });
    return data.user;
  },

  async signUp(email, password, fullName) {
    let data;
    let error;
    try {
      ({ data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } },
      }));
    } catch (err) {
      dbError(authError(err));
    }
    if (error) dbError(authError(error));
    if (!data?.user) dbError('Account creation could not be completed. Please try again.');
    return data.user;
  },

  async signOut() {
    await writeAuditLog({ action: 'Logout', entityType: 'Auth', result: 'Success' });
    await supabase.auth.signOut();
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    return { ...user, profile };
  },

  async sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) dbError(error.message);
  },

  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) dbError(error.message);
  },

  async getCurrentOrg(orgId) {
    if (!orgId) return null;
    const { data, error } = await supabase
      .from('organisations')
      .select('*, organisation_settings(*)')
      .eq('id', orgId)
      .single();
    if (error) dbError('Could not load organisation: ' + error.message);
    return data;
  },

  async getUserOrgs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('organisation_memberships')
      .select('role, is_active, organisations(id, name, display_name, industry)')
      .eq('user_id', user.id)
      .eq('is_active', true);
    if (error) dbError(error.message);
    return data || [];
  },

  async createOrg({ name, displayName, industry }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) dbError('Unauthenticated.');
    const { data: org, error: orgErr } = await supabase
      .from('organisations')
      .insert({ name, display_name: displayName, industry, created_by: user.id })
      .select()
      .single();
    if (orgErr) dbError(orgErr.message);
    // Trigger handle_new_organisation fires automatically on insert
    const { error: settErr } = await supabase
      .from('organisation_settings')
      .insert({ organisation_id: org.id });
    if (settErr) dbError(settErr.message);
    await writeAuditLog({ orgId: org.id, action: 'Organisation Created', entityType: 'Organisation', entityId: org.id, result: 'Success' });
    return org;
  },

  async updateOrg(orgId, fields) {
    await enforcePermission(orgId, 'settings.update');
    const { error } = await supabase
      .from('organisations')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', orgId);
    if (error) dbError(error.message);
    await writeAuditLog({ orgId, action: 'Organisation Updated', entityType: 'Organisation', entityId: orgId, result: 'Success', metadata: { fields: Object.keys(fields) } });
  },

  async updateOrgSettings(orgId, patch) {
    await enforcePermission(orgId, 'settings.update');
    const update = { ...patch, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from('organisation_settings')
      .upsert({ organisation_id: orgId, ...update });
    if (error) dbError(error.message);
    await writeAuditLog({ orgId, action: 'Settings Updated', entityType: 'OrganisationSettings', entityId: orgId, result: 'Success', metadata: { keys: Object.keys(patch) } });
  },

  async getOrgMembers(orgId) {
    await enforcePermission(orgId, 'members.view');
    const { data, error } = await supabase.rpc('get_org_members', {
      p_org_id: orgId
    });
    if (error) dbError(error.message);
    // Map response columns to expected object format:
    // { role, is_active, user_id, user_profiles: { email, full_name, avatar_initials } }
    return (data || []).map(m => ({
      role: m.role,
      is_active: m.is_active,
      user_id: m.user_id,
      user_profiles: {
        email: m.email,
        full_name: m.full_name,
        avatar_initials: m.avatar_initials
      }
    }));
  },

  async inviteMember(orgId, email, role) {
    const inviterRole = await enforcePermission(orgId, 'members.invite');
    if (inviterRole !== 'Organisation Owner' && role === 'Organisation Owner') {
      await writeAuditLog({ orgId, action: 'Escalation Rejected', entityType: 'Invitation', result: 'Denied', metadata: { email, role } });
      dbError('Only Organisation Owners can assign the Owner role.');
    }
    const { data: { user } } = await supabase.auth.getUser();
    
    // To invite a member securely:
    // First, verify if the user profile exists for this email
    // In a production system, this could check profiles or send a tokenized invitation record.
    // For now, we write to invitations table (managed by RLS policies).
    const { error } = await supabase
      .from('invitations')
      .insert({ organisation_id: orgId, email, role, invited_by: user.id });
    if (error) {
      if (error.code === '23505') dbError('This email has already been invited to this organisation.');
      dbError(error.message);
    }
    await writeAuditLog({ orgId, action: 'Member Invited', entityType: 'Invitation', result: 'Success', metadata: { email, role } });
  },

  async removeMember(orgId, userId) {
    await enforcePermission(orgId, 'members.remove');
    const { data: { user } } = await supabase.auth.getUser();
    if (user.id === userId) dbError('You cannot remove yourself from the organisation.');
    
    // Invoke the secure handle_membership trigger RPC
    const { error } = await supabase.rpc('manage_membership', {
      p_org_id: orgId,
      p_target_user_id: userId,
      p_action: 'deactivate'
    });
    
    if (error) dbError(error.message);
    // manage_membership writes the authoritative audit row in the same transaction.
  },

  async changeRole(orgId, userId, newRole) {
    await enforcePermission(orgId, 'members.update');
    
    // Invoke the secure handle_membership trigger RPC
    const { error } = await supabase.rpc('manage_membership', {
      p_org_id: orgId,
      p_target_user_id: userId,
      p_action: 'change_role',
      p_role: newRole
    });

    if (error) dbError(error.message);
    // manage_membership writes the authoritative audit row in the same transaction.
  },

  async getAuditLogs(orgId) {
    await enforcePermission(orgId, 'audit.view');
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) dbError(error.message);
    return data || [];
  },

  async listReadinessAssessments(orgId) {
    requireOrgId(orgId);
    const { data, error } = await supabase
      .from('readiness_assessments')
      .select('*')
      .eq('organisation_id', orgId)
      .order('updated_at', { ascending: false });
    if (error) dbError('Could not load readiness assessments: ' + error.message);
    return data || [];
  },

  async createReadinessAssessment(orgId, input) {
    requireOrgId(orgId);
    const user = await requireUser();
    const title = input.title?.trim();
    if (!title || title.length < 3 || title.length > 120) {
      dbError('Assessment title must be between 3 and 120 characters.');
    }
    const { data, error } = await supabase
      .from('readiness_assessments')
      .insert({
        organisation_id: orgId,
        title,
        status: 'Draft',
        answers: {},
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();
    if (error) dbError('Could not create assessment: ' + error.message);
    return data;
  },

  async updateReadinessAssessment(orgId, assessmentId, patch) {
    requireOrgId(orgId);
    if (!assessmentId) dbError('Assessment ID is required.');
    const user = await requireUser();
    const allowed = ['title', 'status', 'answers', 'score', 'risk_level', 'completed_at'];
    const update = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)));
    if (update.title !== undefined) {
      update.title = update.title.trim();
      if (update.title.length < 3 || update.title.length > 120) dbError('Invalid assessment title.');
    }
    update.updated_by = user.id;
    update.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('readiness_assessments')
      .update(update)
      .eq('id', assessmentId)
      .eq('organisation_id', orgId)
      .select()
      .single();
    if (error) dbError('Could not update assessment: ' + error.message);
    return data;
  },

  async deleteReadinessAssessment(orgId, assessmentId) {
    requireOrgId(orgId);
    const { error } = await supabase
      .from('readiness_assessments')
      .delete()
      .eq('id', assessmentId)
      .eq('organisation_id', orgId);
    if (error) dbError('Could not delete assessment: ' + error.message);
  },

  async listActionPlanItems(orgId) {
    requireOrgId(orgId);
    const { data, error } = await supabase
      .from('action_plan_items')
      .select('*, readiness_assessments(title)')
      .eq('organisation_id', orgId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) dbError('Could not load action plan: ' + error.message);
    return data || [];
  },

  async createActionPlanItem(orgId, input) {
    requireOrgId(orgId);
    const user = await requireUser();
    const title = input.title?.trim();
    if (!title || title.length < 3 || title.length > 160) {
      dbError('Action title must be between 3 and 160 characters.');
    }
    const { data, error } = await supabase
      .from('action_plan_items')
      .insert({
        organisation_id: orgId,
        assessment_id: input.assessment_id || null,
        title,
        description: input.description?.trim() || null,
        priority: input.priority || 'Medium',
        status: input.status || 'Open',
        due_date: input.due_date || null,
        owner_name: input.owner_name?.trim() || null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();
    if (error) dbError('Could not create action item: ' + error.message);
    return data;
  },

  async updateActionPlanItem(orgId, itemId, patch) {
    requireOrgId(orgId);
    if (!itemId) dbError('Action item ID is required.');
    const user = await requireUser();
    const allowed = ['title', 'description', 'priority', 'status', 'due_date', 'owner_name'];
    const update = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)));
    if (update.title !== undefined) {
      update.title = update.title.trim();
      if (update.title.length < 3 || update.title.length > 160) dbError('Invalid action title.');
    }
    update.updated_by = user.id;
    update.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('action_plan_items')
      .update(update)
      .eq('id', itemId)
      .eq('organisation_id', orgId)
      .select()
      .single();
    if (error) dbError('Could not update action item: ' + error.message);
    return data;
  },

  async deleteActionPlanItem(orgId, itemId) {
    requireOrgId(orgId);
    const { error } = await supabase
      .from('action_plan_items')
      .delete()
      .eq('id', itemId)
      .eq('organisation_id', orgId);
    if (error) dbError('Could not delete action item: ' + error.message);
  },

  async listDataInventory(orgId) {
    requireOrgId(orgId);
    const { data, error } = await supabase
      .from('data_inventory_records')
      .select('*')
      .eq('organisation_id', orgId)
      .order('updated_at', { ascending: false });
    if (error) dbError('Could not load data inventory: ' + error.message);
    return data || [];
  },

  async createDataInventoryRecord(orgId, input) {
    requireOrgId(orgId);
    const user = await requireUser();
    const name = input.record_name?.trim();
    if (!name || name.length < 3 || name.length > 160) dbError('Inventory name must be between 3 and 160 characters.');
    if (!input.data_category?.trim() || !input.processing_purpose?.trim()) dbError('Category and processing purpose are required.');
    const { data, error } = await supabase
      .from('data_inventory_records')
      .insert({
        organisation_id: orgId,
        record_name: name,
        data_category: input.data_category.trim(),
        data_subjects: input.data_subjects || [],
        processing_purpose: input.processing_purpose.trim(),
        lawful_basis: input.lawful_basis,
        systems: input.systems || [],
        storage_locations: input.storage_locations || [],
        retention_period: input.retention_period?.trim() || null,
        sensitivity: input.sensitivity,
        owner_name: input.owner_name?.trim() || null,
        status: input.status,
        created_by: user.id,
        updated_by: user.id,
      })
      .select().single();
    if (error) dbError('Could not create inventory record: ' + error.message);
    return data;
  },

  async updateDataInventoryRecord(orgId, recordId, input) {
    requireOrgId(orgId);
    const user = await requireUser();
    const allowed = ['record_name', 'data_category', 'data_subjects', 'processing_purpose', 'lawful_basis', 'systems', 'storage_locations', 'retention_period', 'sensitivity', 'owner_name', 'status'];
    const update = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
    if (update.record_name !== undefined) {
      update.record_name = update.record_name.trim();
      if (update.record_name.length < 3 || update.record_name.length > 160) dbError('Invalid inventory name.');
    }
    update.updated_by = user.id; update.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('data_inventory_records').update(update)
      .eq('id', recordId).eq('organisation_id', orgId).select().single();
    if (error) dbError('Could not update inventory record: ' + error.message);
    return data;
  },

  async deleteDataInventoryRecord(orgId, recordId) {
    requireOrgId(orgId);
    const { error } = await supabase.from('data_inventory_records').delete()
      .eq('id', recordId).eq('organisation_id', orgId);
    if (error) dbError('Could not delete inventory record: ' + error.message);
  },

  async listPrivacyRisks(orgId) {
    requireOrgId(orgId);
    const { data: risks, error } = await supabase.from('privacy_risks').select('*')
      .eq('organisation_id', orgId).order('inherent_score', { ascending: false });
    if (error) dbError('Could not load privacy risks: ' + error.message);
    if (!risks?.length) return [];
    const { data: links, error: linkError } = await supabase
      .from('privacy_risk_inventory_links')
      .select('risk_id, inventory_record_id')
      .eq('organisation_id', orgId)
      .in('risk_id', risks.map((risk) => risk.id));
    if (linkError) dbError('Could not load risk links: ' + linkError.message);
    return risks.map((risk) => ({
      ...risk,
      inventory_record_ids: (links || []).filter((link) => link.risk_id === risk.id).map((link) => link.inventory_record_id),
    }));
  },

  async createPrivacyRisk(orgId, input) {
    requireOrgId(orgId);
    const user = await requireUser();
    const title = input.title?.trim();
    if (!title || title.length < 3 || title.length > 160) dbError('Risk title must be between 3 and 160 characters.');
    if (!input.description?.trim()) dbError('Risk description is required.');
    const { data: risk, error } = await supabase.from('privacy_risks').insert({
      organisation_id: orgId, title, description: input.description.trim(), category: input.category,
      likelihood: Number(input.likelihood), impact: Number(input.impact), status: input.status,
      treatment: input.treatment?.trim() || null, owner_name: input.owner_name?.trim() || null,
      review_date: input.review_date || null, created_by: user.id, updated_by: user.id,
    }).select().single();
    if (error) dbError('Could not create privacy risk: ' + error.message);
    const inventoryIds = [...new Set(input.inventory_record_ids || [])];
    if (inventoryIds.length) {
      const { error: linkError } = await supabase.from('privacy_risk_inventory_links').insert(
        inventoryIds.map((inventoryId) => ({ organisation_id: orgId, risk_id: risk.id, inventory_record_id: inventoryId, created_by: user.id })),
      );
      if (linkError) {
        await supabase.from('privacy_risks').delete().eq('id', risk.id).eq('organisation_id', orgId);
        dbError('Could not link inventory records: ' + linkError.message);
      }
    }
    return { ...risk, inventory_record_ids: inventoryIds };
  },

  async updatePrivacyRisk(orgId, riskId, input) {
    requireOrgId(orgId);
    const user = await requireUser();
    const allowed = ['title', 'description', 'category', 'likelihood', 'impact', 'status', 'treatment', 'owner_name', 'review_date'];
    const update = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
    if (update.title !== undefined) {
      update.title = update.title.trim();
      if (update.title.length < 3 || update.title.length > 160) dbError('Invalid risk title.');
    }
    update.updated_by = user.id; update.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('privacy_risks').update(update)
      .eq('id', riskId).eq('organisation_id', orgId).select().single();
    if (error) dbError('Could not update privacy risk: ' + error.message);
    return data;
  },

  async replacePrivacyRiskLinks(orgId, riskId, inventoryRecordIds) {
    requireOrgId(orgId);
    const user = await requireUser();
    const { error: deleteError } = await supabase.from('privacy_risk_inventory_links').delete()
      .eq('risk_id', riskId).eq('organisation_id', orgId);
    if (deleteError) dbError('Could not update risk links: ' + deleteError.message);
    const uniqueIds = [...new Set(inventoryRecordIds || [])];
    if (!uniqueIds.length) return [];
    const { error } = await supabase.from('privacy_risk_inventory_links').insert(
      uniqueIds.map((inventoryId) => ({ organisation_id: orgId, risk_id: riskId, inventory_record_id: inventoryId, created_by: user.id })),
    );
    if (error) dbError('Could not update risk links: ' + error.message);
    return uniqueIds;
  },

  async deletePrivacyRisk(orgId, riskId) {
    requireOrgId(orgId);
    const { error } = await supabase.from('privacy_risks').delete()
      .eq('id', riskId).eq('organisation_id', orgId);
    if (error) dbError('Could not delete privacy risk: ' + error.message);
  },

  async listVendors(orgId) {
    requireOrgId(orgId);
    const { data, error } = await supabase.from('vendors').select('*')
      .eq('organisation_id', orgId).order('risk_score', { ascending: false });
    if (error) dbError('Could not load vendors: ' + error.message);
    return data || [];
  },

  async createVendor(orgId, input) {
    requireOrgId(orgId); const user = await requireUser();
    if (!input.name?.trim() || input.name.trim().length < 2) dbError('Vendor name is required.');
    if (!input.service_description?.trim()) dbError('Service description is required.');
    const { data, error } = await supabase.from('vendors').insert({
      organisation_id: orgId, name: input.name.trim(), service_description: input.service_description.trim(),
      processor_role: input.processor_role, contact_email: input.contact_email?.trim() || null,
      processing_countries: input.processing_countries || [], data_categories: input.data_categories || [],
      lifecycle_status: input.lifecycle_status || 'Intake', security_score: Number(input.security_score),
      privacy_score: Number(input.privacy_score), data_sensitivity_score: Number(input.data_sensitivity_score),
      business_criticality_score: Number(input.business_criticality_score),
      assessment_summary: input.assessment_summary?.trim() || null, approval_decision: input.approval_decision || 'Pending',
      approval_notes: input.approval_notes?.trim() || null, next_reassessment_date: input.next_reassessment_date || null,
      offboarding_notes: input.offboarding_notes?.trim() || null, created_by: user.id, updated_by: user.id,
    }).select().single();
    if (error) dbError('Could not create vendor: ' + error.message);
    return data;
  },

  async updateVendor(orgId, vendorId, input) {
    requireOrgId(orgId); const user = await requireUser();
    const allowed = ['name', 'service_description', 'processor_role', 'contact_email', 'processing_countries', 'data_categories', 'lifecycle_status', 'security_score', 'privacy_score', 'data_sensitivity_score', 'business_criticality_score', 'assessment_summary', 'approval_decision', 'approval_notes', 'next_reassessment_date', 'offboarding_notes'];
    const update = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
    if (update.name !== undefined && update.name.trim().length < 2) dbError('Invalid vendor name.');
    if (update.approval_decision && update.approval_decision !== 'Pending') {
      update.approved_by = user.id; update.approved_at = new Date().toISOString();
    }
    update.updated_by = user.id; update.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('vendors').update(update)
      .eq('id', vendorId).eq('organisation_id', orgId).select().single();
    if (error) dbError('Could not update vendor: ' + error.message);
    return data;
  },

  async deleteVendor(orgId, vendorId) {
    requireOrgId(orgId);
    const { error } = await supabase.from('vendors').delete().eq('id', vendorId).eq('organisation_id', orgId);
    if (error) dbError('Could not delete vendor: ' + error.message);
  },

  async listVendorEvidence(orgId, vendorId = null) {
    requireOrgId(orgId);
    let query = supabase.from('vendor_evidence').select('*').eq('organisation_id', orgId).order('created_at', { ascending: false });
    if (vendorId) query = query.eq('vendor_id', vendorId);
    const { data, error } = await query;
    if (error) dbError('Could not load vendor evidence: ' + error.message);
    return data || [];
  },

  async createVendorEvidence(orgId, vendorId, input) {
    requireOrgId(orgId); const user = await requireUser();
    if (!input.document_name?.trim()) dbError('Evidence document name is required.');
    const { data, error } = await supabase.from('vendor_evidence').insert({
      organisation_id: orgId, vendor_id: vendorId, evidence_type: input.evidence_type,
      document_name: input.document_name.trim(), evidence_url: input.evidence_url?.trim() || null,
      review_status: input.review_status || 'Pending', expires_on: input.expires_on || null,
      notes: input.notes?.trim() || null, created_by: user.id,
    }).select().single();
    if (error) dbError('Could not add vendor evidence: ' + error.message);
    return data;
  },

  async updateVendorEvidence(orgId, evidenceId, patch) {
    requireOrgId(orgId);
    const allowed = ['evidence_type', 'document_name', 'evidence_url', 'review_status', 'expires_on', 'notes'];
    const update = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)));
    const { data, error } = await supabase.from('vendor_evidence').update(update)
      .eq('id', evidenceId).eq('organisation_id', orgId).select().single();
    if (error) dbError('Could not update vendor evidence: ' + error.message);
    return data;
  },

  async deleteVendorEvidence(orgId, evidenceId) {
    requireOrgId(orgId);
    const { error } = await supabase.from('vendor_evidence').delete()
      .eq('id', evidenceId).eq('organisation_id', orgId);
    if (error) dbError('Could not delete vendor evidence: ' + error.message);
  },

  async submitDataPrincipalRequest(input) {
    const { data, error } = await supabase.rpc('submit_data_principal_request', {
      p_organisation_id: input.organisation_id,
      p_principal_name: input.principal_name,
      p_principal_email: input.principal_email,
      p_request_type: input.request_type,
      p_request_details: input.request_details,
    });
    if (error) dbError('Could not submit request: ' + error.message);
    return data;
  },

  async listRightsRequests(orgId) {
    requireOrgId(orgId);
    const { data, error } = await supabase.from('data_principal_requests').select('*')
      .eq('organisation_id', orgId).order('submitted_at', { ascending: false });
    if (error) dbError('Could not load rights requests: ' + error.message);
    return data || [];
  },

  async listRightsRequestEvents(orgId, requestId) {
    requireOrgId(orgId);
    const { data, error } = await supabase.from('rights_request_events').select('*')
      .eq('organisation_id', orgId).eq('request_id', requestId).order('created_at', { ascending: true });
    if (error) dbError('Could not load request timeline: ' + error.message);
    return data || [];
  },

  async updateRightsRequest(orgId, requestId, patch, eventType = 'Status Changed', eventNote = null) {
    requireOrgId(orgId); const user = await requireUser();
    const allowed = ['verification_status', 'assigned_to', 'due_date', 'status', 'response_text'];
    const update = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)));
    if (update.response_text) update.responded_at = new Date().toISOString();
    update.updated_by = user.id; update.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('data_principal_requests').update(update)
      .eq('id', requestId).eq('organisation_id', orgId).select().single();
    if (error) dbError('Could not update rights request: ' + error.message);
    const { error: eventError } = await supabase.from('rights_request_events').insert({
      organisation_id: orgId, request_id: requestId, event_type: eventType,
      event_note: eventNote || `Workflow updated: ${Object.keys(update).filter((key) => !key.endsWith('_at') && key !== 'updated_by').join(', ')}`,
      actor_user_id: user.id,
    });
    if (eventError) dbError('Request updated but timeline event failed: ' + eventError.message);
    return data;
  },

  async addRightsRequestNote(orgId, requestId, note) {
    requireOrgId(orgId); const user = await requireUser();
    if (!note?.trim()) dbError('Timeline note cannot be empty.');
    const { data, error } = await supabase.from('rights_request_events').insert({
      organisation_id: orgId, request_id: requestId, event_type: 'Note', event_note: note.trim(), actor_user_id: user.id,
    }).select().single();
    if (error) dbError('Could not add timeline note: ' + error.message);
    return data;
  },

  async deleteRightsRequest(orgId, requestId) {
    requireOrgId(orgId);
    const { error } = await supabase.from('data_principal_requests').delete()
      .eq('id', requestId).eq('organisation_id', orgId);
    if (error) dbError('Could not delete rights request: ' + error.message);
  },

  async listConsentData(orgId) {
    requireOrgId(orgId);
    const [purposes, notices, records, events] = await Promise.all([
      supabase.from('consent_purposes').select('*').eq('organisation_id', orgId).order('name'),
      supabase.from('consent_notice_versions').select('*').eq('organisation_id', orgId).order('created_at', { ascending: false }),
      supabase.from('consent_records').select('*').eq('organisation_id', orgId).order('granted_at', { ascending: false }),
      supabase.from('consent_events').select('*').eq('organisation_id', orgId).order('created_at', { ascending: false }),
    ]);
    const failure = [purposes, notices, records, events].find((result) => result.error);
    if (failure) dbError('Could not load consent data: ' + failure.error.message);
    return { purposes: purposes.data || [], notices: notices.data || [], records: records.data || [], events: events.data || [] };
  },
  async createConsentPurpose(orgId, input) {
    requireOrgId(orgId); const user = await requireUser();
    if (!input.name?.trim() || !input.description?.trim()) dbError('Purpose name and description are required.');
    const { data, error } = await supabase.from('consent_purposes').insert({ organisation_id: orgId, name: input.name.trim(), description: input.description.trim(), lawful_basis: input.lawful_basis, is_active: input.is_active ?? true, created_by: user.id, updated_by: user.id }).select().single();
    if (error) dbError('Could not create consent purpose: ' + error.message); return data;
  },
  async updateConsentPurpose(orgId, id, patch) {
    requireOrgId(orgId); const user = await requireUser(); const { data, error } = await supabase.from('consent_purposes').update({ ...patch, updated_by: user.id, updated_at: new Date().toISOString() }).eq('id', id).eq('organisation_id', orgId).select().single();
    if (error) dbError('Could not update consent purpose: ' + error.message); return data;
  },
  async deleteConsentPurpose(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('consent_purposes').delete().eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not delete consent purpose: ' + error.message); },
  async createConsentNotice(orgId, input) {
    requireOrgId(orgId); const user = await requireUser(); if (!input.purpose_id || input.content?.trim().length < 10) dbError('Purpose and notice content are required.');
    const { data, error } = await supabase.from('consent_notice_versions').insert({ organisation_id: orgId, purpose_id: input.purpose_id, version_label: input.version_label.trim(), content: input.content.trim(), status: input.status, published_at: input.status === 'Published' ? new Date().toISOString() : null, created_by: user.id }).select().single();
    if (error) dbError('Could not create notice version: ' + error.message); return data;
  },
  async updateConsentNotice(orgId, id, patch) { requireOrgId(orgId); const update = { ...patch }; if (patch.status === 'Published') update.published_at = new Date().toISOString(); const { data, error } = await supabase.from('consent_notice_versions').update(update).eq('id', id).eq('organisation_id', orgId).select().single(); if (error) dbError('Could not update notice: ' + error.message); return data; },
  async deleteConsentNotice(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('consent_notice_versions').delete().eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not delete notice: ' + error.message); },
  async createConsentRecord(orgId, input) {
    requireOrgId(orgId); const user = await requireUser(); if (!input.principal_reference?.trim() || !input.notice_version_id) dbError('Principal reference and notice version are required.');
    const { data, error } = await supabase.from('consent_records').insert({ organisation_id: orgId, principal_reference: input.principal_reference.trim(), purpose_id: input.purpose_id, notice_version_id: input.notice_version_id, collection_channel: input.collection_channel.trim(), created_by: user.id, updated_by: user.id }).select().single();
    if (error) dbError('Could not create consent record: ' + error.message);
    const { error: eventError } = await supabase.from('consent_events').insert({ organisation_id: orgId, consent_record_id: data.id, event_type: 'Granted', event_note: 'Consent recorded.', actor_user_id: user.id });
    if (eventError) dbError('Consent created but event failed: ' + eventError.message); return data;
  },
  async withdrawConsent(orgId, id, reason) {
    requireOrgId(orgId); const user = await requireUser(); if (!reason?.trim()) dbError('Withdrawal reason is required.'); const now = new Date().toISOString();
    const { data, error } = await supabase.from('consent_records').update({ status: 'Withdrawn', withdrawn_at: now, withdrawal_reason: reason.trim(), updated_by: user.id, updated_at: now }).eq('id', id).eq('organisation_id', orgId).select().single();
    if (error) dbError('Could not withdraw consent: ' + error.message);
    const { error: eventError } = await supabase.from('consent_events').insert({ organisation_id: orgId, consent_record_id: id, event_type: 'Withdrawn', event_note: reason.trim(), actor_user_id: user.id });
    if (eventError) dbError('Consent withdrawn but event failed: ' + eventError.message); return data;
  },
  async deleteConsentRecord(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('consent_records').delete().eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not delete consent record: ' + error.message); },

  async listIncidents(orgId) {
    requireOrgId(orgId); const [incidents, actions, notifications] = await Promise.all([supabase.from('privacy_incidents').select('*').eq('organisation_id', orgId).order('detected_at', { ascending: false }), supabase.from('incident_actions').select('*').eq('organisation_id', orgId).order('created_at'), supabase.from('incident_notifications').select('*').eq('organisation_id', orgId).order('created_at')]);
    const failure = [incidents, actions, notifications].find((result) => result.error); if (failure) dbError('Could not load incidents: ' + failure.error.message);
    return (incidents.data || []).map((incident) => ({ ...incident, actions: (actions.data || []).filter((item) => item.incident_id === incident.id), notifications: (notifications.data || []).filter((item) => item.incident_id === incident.id) }));
  },
  async createIncident(orgId, input) { requireOrgId(orgId); const user = await requireUser(); if (!input.title?.trim() || input.summary?.trim().length < 10) dbError('Incident title and detailed summary are required.'); const { data, error } = await supabase.from('privacy_incidents').insert({ organisation_id: orgId, title: input.title.trim(), summary: input.summary.trim(), severity: input.severity, status: input.status, affected_data_categories: input.affected_data_categories || [], affected_principals: input.affected_principals ? Number(input.affected_principals) : null, detected_at: input.detected_at, owner_name: input.owner_name?.trim() || null, created_by: user.id, updated_by: user.id }).select().single(); if (error) dbError('Could not create incident: ' + error.message); return { ...data, actions: [], notifications: [] }; },
  async updateIncident(orgId, id, patch) { requireOrgId(orgId); const user = await requireUser(); const allowed = ['title','summary','severity','status','affected_data_categories','affected_principals','detected_at','contained_at','root_cause','closure_report','closed_at','owner_name']; const update = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key))); if (patch.status === 'Closed') update.closed_at = new Date().toISOString(); if (patch.status === 'Contained') update.contained_at = new Date().toISOString(); update.updated_by = user.id; update.updated_at = new Date().toISOString(); const { data, error } = await supabase.from('privacy_incidents').update(update).eq('id', id).eq('organisation_id', orgId).select().single(); if (error) dbError('Could not update incident: ' + error.message); return data; },
  async deleteIncident(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('privacy_incidents').delete().eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not delete incident: ' + error.message); },
  async createIncidentAction(orgId, incidentId, input) { requireOrgId(orgId); const user = await requireUser(); const { data, error } = await supabase.from('incident_actions').insert({ organisation_id: orgId, incident_id: incidentId, action_text: input.action_text.trim(), status: input.status || 'Open', owner_name: input.owner_name?.trim() || null, due_at: input.due_at || null, created_by: user.id }).select().single(); if (error) dbError('Could not add incident action: ' + error.message); return data; },
  async updateIncidentAction(orgId, id, patch) { requireOrgId(orgId); const update = { ...patch }; if (patch.status === 'Completed') update.completed_at = new Date().toISOString(); const { data, error } = await supabase.from('incident_actions').update(update).eq('id', id).eq('organisation_id', orgId).select().single(); if (error) dbError('Could not update incident action: ' + error.message); return data; },
  async deleteIncidentAction(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('incident_actions').delete().eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not delete incident action: ' + error.message); },
  async createIncidentNotification(orgId, incidentId, input) { requireOrgId(orgId); const user = await requireUser(); const { data, error } = await supabase.from('incident_notifications').insert({ organisation_id: orgId, incident_id: incidentId, recipient_type: input.recipient_type, notification_status: input.notification_status, notified_at: input.notification_status === 'Sent' ? new Date().toISOString() : null, message_summary: input.message_summary.trim(), created_by: user.id }).select().single(); if (error) dbError('Could not add notification: ' + error.message); return data; },
  async updateIncidentNotification(orgId, id, patch) { requireOrgId(orgId); const update = { ...patch }; if (patch.notification_status === 'Sent') update.notified_at = new Date().toISOString(); const { data, error } = await supabase.from('incident_notifications').update(update).eq('id', id).eq('organisation_id', orgId).select().single(); if (error) dbError('Could not update notification: ' + error.message); return data; },
  async deleteIncidentNotification(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('incident_notifications').delete().eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not delete notification: ' + error.message); },

  async listPolicies(orgId) { requireOrgId(orgId); const { data, error } = await supabase.from('privacy_policies').select('*').eq('organisation_id', orgId).order('updated_at', { ascending: false }); if (error) dbError('Could not load policies: ' + error.message); return data || []; },
  async createPolicy(orgId, input) { requireOrgId(orgId); const user = await requireUser(); if (!input.title?.trim() || input.content?.trim().length < 10) dbError('Policy title and content are required.'); const { data, error } = await supabase.from('privacy_policies').insert({ organisation_id: orgId, title: input.title.trim(), policy_type: input.policy_type.trim(), version_label: input.version_label.trim(), content: input.content.trim(), lifecycle_status: 'Draft', owner_name: input.owner_name?.trim() || null, review_due_date: input.review_due_date || null, created_by: user.id, updated_by: user.id }).select().single(); if (error) dbError('Could not create policy: ' + error.message); return data; },
  async updatePolicy(orgId, id, patch) { requireOrgId(orgId); const user = await requireUser(); const allowed = ['title','policy_type','version_label','content','lifecycle_status','owner_name','reviewer_user_id','approver_user_id','review_due_date']; const update = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key))); if (patch.lifecycle_status === 'Approved') { update.approved_at = new Date().toISOString(); update.approver_user_id = patch.approver_user_id || user.id; } if (patch.lifecycle_status === 'Published') update.published_at = new Date().toISOString(); if (patch.lifecycle_status === 'Archived') update.archived_at = new Date().toISOString(); update.updated_by = user.id; update.updated_at = new Date().toISOString(); const { data, error } = await supabase.from('privacy_policies').update(update).eq('id', id).eq('organisation_id', orgId).select().single(); if (error) dbError('Could not update policy: ' + error.message); return data; },
  async deletePolicy(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('privacy_policies').delete().eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not delete policy: ' + error.message); },

  async listDocumentWorkspace(orgId) {
    requireOrgId(orgId); const [templates, documents, versions, comments, links] = await Promise.all([supabase.from('document_templates').select('*').eq('is_active', true).order('name'), supabase.from('generated_documents').select('*').eq('organisation_id', orgId).order('updated_at', { ascending: false }), supabase.from('document_versions').select('*').eq('organisation_id', orgId).order('version_number', { ascending: false }), supabase.from('document_comments').select('*').eq('organisation_id', orgId).order('created_at'), supabase.from('document_record_links').select('*').eq('organisation_id', orgId).order('created_at')]);
    const failure = [templates, documents, versions, comments, links].find((result) => result.error); if (failure) dbError('Could not load document workspace: ' + failure.error.message);
    return { templates: templates.data || [], documents: documents.data || [], versions: versions.data || [], comments: comments.data || [], links: links.data || [] };
  },
  async createGeneratedDocument(orgId, input) {
    requireOrgId(orgId); const user = await requireUser(); if (!input.title?.trim() || input.content?.trim().length < 10) dbError('Document title and content are required.');
    const { data, error } = await supabase.from('generated_documents').insert({ organisation_id: orgId, template_id: input.template_id, title: input.title.trim(), input_data: input.input_data, content: input.content, status: 'Draft', created_by: user.id, updated_by: user.id }).select().single(); if (error) dbError('Could not generate document: ' + error.message);
    const { error: versionError } = await supabase.from('document_versions').insert({ organisation_id: orgId, document_id: data.id, version_number: 1, content: data.content, input_data: data.input_data, status: data.status, created_by: user.id });
    if (versionError) { await supabase.from('generated_documents').delete().eq('id', data.id).eq('organisation_id', orgId); dbError('Could not create initial document version: ' + versionError.message); } return data;
  },
  async saveGeneratedDocument(orgId, id, patch) {
    requireOrgId(orgId); const user = await requireUser(); const nextVersion = Number(patch.current_version) + 1; const update = { title: patch.title.trim(), content: patch.content, input_data: patch.input_data, status: patch.status, current_version: nextVersion, reviewer_user_id: patch.reviewer_user_id || null, approver_user_id: patch.approver_user_id || null, updated_by: user.id, updated_at: new Date().toISOString() }; if (patch.status === 'Approved') update.approved_at = new Date().toISOString();
    const { data, error } = await supabase.from('generated_documents').update(update).eq('id', id).eq('organisation_id', orgId).select().single(); if (error) dbError('Could not save document: ' + error.message);
    const { error: versionError } = await supabase.from('document_versions').insert({ organisation_id: orgId, document_id: id, version_number: nextVersion, content: data.content, input_data: data.input_data, status: data.status, created_by: user.id }); if (versionError) dbError('Document saved but version history failed: ' + versionError.message); if (patch.status === 'Approved') await writeAuditLog({ orgId, action: 'document.approve', entityType: 'generated_documents', entityId: id, result: 'Success', metadata: { action: 'approve' } }); return data;
  },
  async deleteGeneratedDocument(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('generated_documents').delete().eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not delete document: ' + error.message); },
  async addDocumentComment(orgId, documentId, text) { requireOrgId(orgId); const user = await requireUser(); if (!text?.trim()) dbError('Comment cannot be empty.'); const { data, error } = await supabase.from('document_comments').insert({ organisation_id: orgId, document_id: documentId, comment_text: text.trim(), created_by: user.id }).select().single(); if (error) dbError('Could not add comment: ' + error.message); return data; },
  async deleteDocumentComment(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('document_comments').delete().eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not delete comment: ' + error.message); },
  async addDocumentLink(orgId, documentId, input) { requireOrgId(orgId); const user = await requireUser(); const { data, error } = await supabase.from('document_record_links').insert({ organisation_id: orgId, document_id: documentId, related_module: input.related_module.trim(), related_record_id: input.related_record_id.trim(), created_by: user.id }).select().single(); if (error) dbError('Could not link record: ' + error.message); return data; },
  async deleteDocumentLink(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('document_record_links').delete().eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not delete link: ' + error.message); },
  async auditDocumentExport(orgId, documentId, mode) { await writeAuditLog({ orgId, action: `document.${mode}`, entityType: 'generated_documents', entityId: documentId, result: 'Success', metadata: { action: mode } }); },

  async listComplianceCalendar(orgId) {
    requireOrgId(orgId); const [tasks, evidence] = await Promise.all([supabase.from('compliance_tasks').select('*').eq('organisation_id', orgId).order('due_date'), supabase.from('calendar_task_evidence').select('*').eq('organisation_id', orgId).order('created_at', { ascending: false })]); const failure = [tasks, evidence].find((result) => result.error); if (failure) dbError('Could not load compliance calendar: ' + failure.error.message); return { tasks: tasks.data || [], evidence: evidence.data || [] };
  },
  async createComplianceTask(orgId, input) { requireOrgId(orgId); const user = await requireUser(); if (!input.title?.trim() || !input.start_date || !input.due_date) dbError('Task title, start date, and due date are required.'); if (input.due_date < input.start_date) dbError('Due date cannot precede start date.'); const { data, error } = await supabase.from('compliance_tasks').insert({ organisation_id: orgId, title: input.title.trim(), description: input.description?.trim() || null, owner_name: input.owner_name?.trim() || null, category: input.category, priority: input.priority, start_date: input.start_date, due_date: input.due_date, status: input.status || 'Open', recurrence: input.recurrence || 'None', reminder_at: input.reminder_at || null, related_module: input.related_module?.trim() || null, related_record_id: input.related_record_id?.trim() || null, created_by: user.id, updated_by: user.id }).select().single(); if (error) dbError('Could not create calendar task: ' + error.message); return data; },
  async updateComplianceTask(orgId, id, patch) { requireOrgId(orgId); const user = await requireUser(); const allowed = ['title','description','owner_name','category','priority','start_date','due_date','status','recurrence','reminder_at','related_module','related_record_id']; const update = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key))); if (update.due_date && update.start_date && update.due_date < update.start_date) dbError('Invalid date range.'); if (patch.status === 'Completed') update.completed_at = new Date().toISOString(); update.updated_by = user.id; update.updated_at = new Date().toISOString(); const { data, error } = await supabase.from('compliance_tasks').update(update).eq('id', id).eq('organisation_id', orgId).select().single(); if (error) dbError('Could not update task: ' + error.message); return data; },
  async deleteComplianceTask(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('compliance_tasks').delete().eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not delete task: ' + error.message); },
  async addCalendarEvidence(orgId, taskId, input) { requireOrgId(orgId); const user = await requireUser(); if (!input.evidence_name?.trim()) dbError('Evidence name is required.'); const { data, error } = await supabase.from('calendar_task_evidence').insert({ organisation_id: orgId, task_id: taskId, evidence_name: input.evidence_name.trim(), evidence_url: input.evidence_url?.trim() || null, notes: input.notes?.trim() || null, created_by: user.id }).select().single(); if (error) dbError('Could not add task evidence: ' + error.message); return data; },
  async deleteCalendarEvidence(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('calendar_task_evidence').delete().eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not delete task evidence: ' + error.message); },

  async listDiscoveryWorkspace(orgId) { requireOrgId(orgId); const [scans, findings] = await Promise.all([supabase.from('discovery_scans').select('*').eq('organisation_id', orgId).order('created_at', { ascending: false }), supabase.from('discovery_findings').select('*').eq('organisation_id', orgId).order('confidence', { ascending: false })]); const failure = [scans, findings].find((result) => result.error); if (failure) dbError('Could not load discovery workspace: ' + failure.error.message); return { scans: scans.data || [], findings: findings.data || [] }; },
  async createDiscoveryScan(orgId, input) { requireOrgId(orgId); const user = await requireUser(); const name = input.source_name?.trim(); if (!name || !['CSV','Excel','Database'].includes(input.source_type)) dbError('A valid source name and type are required.'); const { data, error } = await supabase.from('discovery_scans').insert({ organisation_id: orgId, source_name: name, source_type: input.source_type, status: 'Completed', records_scanned: Number(input.records_scanned) || 0, findings_count: (input.findings || []).length, created_by: user.id, completed_at: new Date().toISOString() }).select().single(); if (error) dbError('Could not save discovery scan: ' + error.message); const findings = (input.findings || []).map((finding) => ({ organisation_id: orgId, scan_id: data.id, field_name: finding.field_name, classification: finding.classification, sensitivity: finding.sensitivity, confidence: finding.confidence, sample_masked: finding.sample_masked || null })); if (findings.length) { const { error: findingError } = await supabase.from('discovery_findings').insert(findings); if (findingError) dbError('Scan saved but findings could not be saved: ' + findingError.message); } return data; },
  async listDataFlowMaps(orgId) { requireOrgId(orgId); const [maps, nodes, edges] = await Promise.all([supabase.from('data_flow_maps').select('*').eq('organisation_id', orgId).order('updated_at', { ascending: false }), supabase.from('data_flow_nodes').select('*').eq('organisation_id', orgId), supabase.from('data_flow_edges').select('*').eq('organisation_id', orgId)]); const failure = [maps, nodes, edges].find((result) => result.error); if (failure) dbError('Could not load data maps: ' + failure.error.message); return (maps.data || []).map((map) => ({ ...map, nodes: (nodes.data || []).filter((node) => node.map_id === map.id), edges: (edges.data || []).filter((edge) => edge.map_id === map.id) })); },
  async createDataFlowMap(orgId, input) { requireOrgId(orgId); const user = await requireUser(); if (!input.name?.trim()) dbError('Map name is required.'); const { data, error } = await supabase.from('data_flow_maps').insert({ organisation_id: orgId, name: input.name.trim(), department: input.department?.trim() || 'General', description: input.description?.trim() || null, created_by: user.id, updated_by: user.id }).select().single(); if (error) dbError('Could not create map: ' + error.message); return data; },
  async addDataFlowNode(orgId, mapId, input) { requireOrgId(orgId); const { data, error } = await supabase.from('data_flow_nodes').insert({ organisation_id: orgId, map_id: mapId, label: input.label.trim(), node_type: input.node_type, risk_level: input.risk_level || 'Low', position_x: Number(input.position_x) || 0, position_y: Number(input.position_y) || 0 }).select().single(); if (error) dbError('Could not add map node: ' + error.message); return data; },
  async createCookieDomain(orgId, input) { requireOrgId(orgId); const user = await requireUser(); const { data, error } = await supabase.from('cookie_domains').insert({ organisation_id: orgId, domain: input.domain.trim().toLowerCase(), geo_mode: input.geo_mode || 'Global', banner_enabled: input.banner_enabled !== false, created_by: user.id }).select().single(); if (error) dbError('Could not add cookie domain: ' + error.message); return data; },
  async listCookieWorkspace(orgId) { requireOrgId(orgId); const [domains, cookies] = await Promise.all([supabase.from('cookie_domains').select('*').eq('organisation_id', orgId).order('domain'), supabase.from('cookie_registry').select('*').eq('organisation_id', orgId).order('cookie_name')]); const failure = [domains, cookies].find((result) => result.error); if (failure) dbError('Could not load cookie workspace: ' + failure.error.message); return { domains: domains.data || [], cookies: cookies.data || [] }; },
  async addCookie(orgId, input) { requireOrgId(orgId); const { data, error } = await supabase.from('cookie_registry').insert({ organisation_id: orgId, domain_id: input.domain_id, cookie_name: input.cookie_name.trim(), category: input.category, provider: input.provider?.trim() || null, duration: input.duration?.trim() || null, blocked_until_consent: input.blocked_until_consent !== false }).select().single(); if (error) dbError('Could not add cookie: ' + error.message); return data; },
  async listNotifications(orgId) { requireOrgId(orgId); const { data, error } = await supabase.from('app_notifications').select('*').eq('organisation_id', orgId).order('created_at', { ascending: false }).limit(100); if (error) dbError('Could not load notifications: ' + error.message); return data || []; },
  async markNotificationRead(orgId, id) { requireOrgId(orgId); const { error } = await supabase.from('app_notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('organisation_id', orgId); if (error) dbError('Could not update notification: ' + error.message); },
  async listAiConversation(orgId, conversationId) { requireOrgId(orgId); const { data, error } = await supabase.from('ai_messages').select('*').eq('organisation_id', orgId).eq('conversation_id', conversationId).order('created_at'); if (error) dbError('Could not load AI history: ' + error.message); return data || []; },
  async createAiConversation(orgId, title = 'New conversation') { requireOrgId(orgId); const user = await requireUser(); const { data, error } = await supabase.from('ai_conversations').insert({ organisation_id: orgId, title: title.slice(0, 160), created_by: user.id }).select().single(); if (error) dbError('Could not create AI conversation: ' + error.message); return data; },
  async addAiMessage(orgId, input) { requireOrgId(orgId); const { data, error } = await supabase.from('ai_messages').insert({ organisation_id: orgId, conversation_id: input.conversation_id, role: input.role, content: input.content.trim(), context_snapshot: input.context_snapshot || {} }).select().single(); if (error) dbError('Could not save AI message: ' + error.message); return data; },
  async askAiCopilot(orgId, question) { requireOrgId(orgId); if (!question?.trim() || question.length > 4000) dbError('Enter a question of up to 4,000 characters.'); const { data, error } = await supabase.functions.invoke('ai-copilot', { body: { organisationId: orgId, question: question.trim() } }); if (error || data?.error) dbError(data?.error || error?.message || 'AI service is unavailable.'); return data; },
  async listSupportTickets(orgId) { requireOrgId(orgId); const { data, error } = await supabase.from('support_tickets').select('*, support_ticket_replies(*), support_ticket_activity(*)').eq('organisation_id', orgId).order('created_at', { ascending: false }); if (error) dbError('Could not load support tickets: ' + error.message); return data || []; },
  async createSupportTicket(orgId, input) { requireOrgId(orgId); const user = await requireUser(); if (!input.title?.trim() || !input.description?.trim()) dbError('Ticket title and description are required.'); const { data, error } = await supabase.from('support_tickets').insert({ organisation_id: orgId, requester_user_id: user.id, ticket_type: input.ticket_type, title: input.title.trim(), description: input.description.trim(), category: input.category || null, priority: input.priority || 'Medium', browser: input.browser || null, operating_system: input.operating_system || null, screen_resolution: input.screen_resolution || null, app_version: input.app_version || null, reproduction_steps: input.reproduction_steps || null, expected_behaviour: input.expected_behaviour || null, actual_behaviour: input.actual_behaviour || null }).select().single(); if (error) dbError('Could not create support ticket: ' + error.message); return data; },
  async replyToSupportTicket(orgId, ticketId, body, isInternal = false) { requireOrgId(orgId); const user = await requireUser(); const { data, error } = await supabase.from('support_ticket_replies').insert({ organisation_id: orgId, ticket_id: ticketId, author_user_id: user.id, body: body.trim(), is_internal: isInternal }).select().single(); if (error) dbError('Could not send support reply: ' + error.message); return data; },
  async updateSupportTicket(orgId, ticketId, patch) { requireOrgId(orgId); const allowed = ['status','priority','assigned_to','resolution_notes']; const update = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key))); if (patch.status === 'Resolved') update.resolved_at = new Date().toISOString(); update.updated_at = new Date().toISOString(); const { data, error } = await supabase.from('support_tickets').update(update).eq('organisation_id', orgId).eq('id', ticketId).select().single(); if (error) dbError('Could not update support ticket: ' + error.message); return data; },
  async createFeatureRequest(orgId, input) { requireOrgId(orgId); const user = await requireUser(); const { data, error } = await supabase.from('feature_requests').insert({ organisation_id: orgId, requester_user_id: user.id, title: input.title.trim(), business_problem: input.business_problem.trim(), proposed_solution: input.proposed_solution || null, expected_benefit: input.expected_benefit || null, department: input.department || null, priority: input.priority || 'Medium' }).select().single(); if (error) dbError('Could not create feature request: ' + error.message); return data; },
  async createCustomerFeedback(orgId, input) { requireOrgId(orgId); const user = await requireUser(); const { error } = await supabase.from('customer_feedback').insert({ organisation_id: orgId, user_id: user.id, rating: Number(input.rating), satisfaction_score: input.satisfaction_score ? Number(input.satisfaction_score) : null, comments: input.comments || null, suggestions: input.suggestions || null }); if (error) dbError('Could not save feedback: ' + error.message); },
  async listKnowledgeBase() { const { data, error } = await supabase.from('knowledge_base_articles').select('*').eq('is_published', true).order('updated_at', { ascending: false }); if (error) dbError('Could not load help articles: ' + error.message); return data || []; },
};

export default dbStore;
