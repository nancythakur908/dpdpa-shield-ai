import { readFileSync } from 'node:fs';
import { assert } from 'chai';

const migration = readFileSync(new URL('./006_phase3_readiness_action_plan.sql', import.meta.url), 'utf8');
const store = readFileSync(new URL('../../utils/dbStoreReal.js', import.meta.url), 'utf8');

describe('Phase 3 readiness and action-plan organisation isolation', () => {
  it('requires organisation_id on every organisation-owned row', () => {
    assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.readiness_assessments[\s\S]*organisation_id UUID NOT NULL/);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.action_plan_items[\s\S]*organisation_id UUID NOT NULL/);
  });

  it('uses authenticated membership helpers in read and mutation policies', () => {
    assert.include(migration, 'USING (public.is_active_org_member(organisation_id))');
    assert.include(migration, 'public.can_manage_privacy_operations(organisation_id)');
    assert.include(migration, 'membership.user_id = auth.uid()');
  });

  it('prevents linking an action item to another organisation assessment', () => {
    assert.match(migration, /FOREIGN KEY \(organisation_id, assessment_id\)[\s\S]*REFERENCES public\.readiness_assessments\(organisation_id, id\)/);
  });

  it('scopes production reads, updates, and deletes by organisation', () => {
    for (const method of ['listReadinessAssessments', 'updateReadinessAssessment', 'deleteReadinessAssessment', 'listActionPlanItems', 'updateActionPlanItem', 'deleteActionPlanItem']) {
      const start = store.indexOf(`async ${method}`);
      const end = store.indexOf('\n  async ', start + 8);
      const body = store.slice(start, end < 0 ? undefined : end);
      assert.include(body, ".eq('organisation_id', orgId)", `${method} must include the tenant predicate`);
    }
  });

  it('audits insert, update, and delete for both tables', () => {
    assert.include(migration, 'AFTER INSERT OR UPDATE OR DELETE ON public.readiness_assessments');
    assert.include(migration, 'AFTER INSERT OR UPDATE OR DELETE ON public.action_plan_items');
    assert.include(migration, 'INSERT INTO public.audit_logs');
    assert.include(migration, "auth.uid()");
  });
});
