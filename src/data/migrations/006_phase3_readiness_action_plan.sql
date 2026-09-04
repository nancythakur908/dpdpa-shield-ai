-- Phase 3: Readiness Assessment and Action Plan.
-- Run after migrations 003 and 005.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_active_org_member(p_organisation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.organisation_memberships AS membership
    WHERE membership.organisation_id = p_organisation_id
      AND membership.user_id = auth.uid()
      AND membership.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_privacy_operations(p_organisation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.organisation_memberships AS membership
    WHERE membership.organisation_id = p_organisation_id
      AND membership.user_id = auth.uid()
      AND membership.is_active
      AND membership.role IN ('Organisation Owner', 'Privacy Admin', 'Privacy Lead')
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_org_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_org_member(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.can_manage_privacy_operations(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_privacy_operations(UUID) TO authenticated;

CREATE TABLE IF NOT EXISTS public.readiness_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 120),
  status TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'In Progress', 'Completed')),
  answers JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(answers) = 'object'),
  score SMALLINT CHECK (score BETWEEN 0 AND 100),
  risk_level TEXT CHECK (risk_level IN ('Low', 'Medium', 'High')),
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, id)
);

CREATE INDEX IF NOT EXISTS idx_readiness_assessments_org_updated
  ON public.readiness_assessments(organisation_id, updated_at DESC);

ALTER TABLE public.readiness_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read readiness assessments" ON public.readiness_assessments;
DROP POLICY IF EXISTS "Managers can create readiness assessments" ON public.readiness_assessments;
DROP POLICY IF EXISTS "Managers can update readiness assessments" ON public.readiness_assessments;
DROP POLICY IF EXISTS "Managers can delete readiness assessments" ON public.readiness_assessments;

CREATE POLICY "Members can read readiness assessments"
  ON public.readiness_assessments FOR SELECT TO authenticated
  USING (public.is_active_org_member(organisation_id));

CREATE POLICY "Managers can create readiness assessments"
  ON public.readiness_assessments FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_privacy_operations(organisation_id)
    AND created_by = auth.uid()
    AND updated_by = auth.uid()
  );

CREATE POLICY "Managers can update readiness assessments"
  ON public.readiness_assessments FOR UPDATE TO authenticated
  USING (public.can_manage_privacy_operations(organisation_id))
  WITH CHECK (
    public.can_manage_privacy_operations(organisation_id)
    AND updated_by = auth.uid()
  );

CREATE POLICY "Managers can delete readiness assessments"
  ON public.readiness_assessments FOR DELETE TO authenticated
  USING (public.can_manage_privacy_operations(organisation_id));

CREATE TABLE IF NOT EXISTS public.action_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  assessment_id UUID,
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 160),
  description TEXT CHECK (length(description) <= 2000),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Blocked', 'Completed')),
  due_date DATE,
  owner_name TEXT CHECK (length(owner_name) <= 120),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT action_plan_assessment_same_org_fk
    FOREIGN KEY (organisation_id, assessment_id)
    REFERENCES public.readiness_assessments(organisation_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_action_plan_items_org_status
  ON public.action_plan_items(organisation_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_action_plan_items_assessment
  ON public.action_plan_items(assessment_id);

ALTER TABLE public.action_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read action plan items" ON public.action_plan_items;
DROP POLICY IF EXISTS "Managers can create action plan items" ON public.action_plan_items;
DROP POLICY IF EXISTS "Managers can update action plan items" ON public.action_plan_items;
DROP POLICY IF EXISTS "Managers can delete action plan items" ON public.action_plan_items;

CREATE POLICY "Members can read action plan items"
  ON public.action_plan_items FOR SELECT TO authenticated
  USING (public.is_active_org_member(organisation_id));

CREATE POLICY "Managers can create action plan items"
  ON public.action_plan_items FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_privacy_operations(organisation_id)
    AND created_by = auth.uid()
    AND updated_by = auth.uid()
  );

CREATE POLICY "Managers can update action plan items"
  ON public.action_plan_items FOR UPDATE TO authenticated
  USING (public.can_manage_privacy_operations(organisation_id))
  WITH CHECK (
    public.can_manage_privacy_operations(organisation_id)
    AND updated_by = auth.uid()
  );

CREATE POLICY "Managers can delete action plan items"
  ON public.action_plan_items FOR DELETE TO authenticated
  USING (public.can_manage_privacy_operations(organisation_id));

CREATE OR REPLACE FUNCTION public.audit_privacy_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row RECORD;
  v_action TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
  ELSE
    v_row := NEW;
  END IF;
  v_action := lower(TG_TABLE_NAME || '.' || TG_OP);

  INSERT INTO public.audit_logs (
    organisation_id, actor_user_id, actor_email, action,
    entity_type, entity_id, result, metadata
  ) VALUES (
    v_row.organisation_id, auth.uid(), auth.jwt() ->> 'email', v_action,
    TG_TABLE_NAME, v_row.id::TEXT, 'Success',
    jsonb_build_object('action', lower(TG_OP))
  );

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_privacy_operation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_readiness_assessment_changes ON public.readiness_assessments;
CREATE TRIGGER audit_readiness_assessment_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.readiness_assessments
  FOR EACH ROW EXECUTE FUNCTION public.audit_privacy_operation();

DROP TRIGGER IF EXISTS audit_action_plan_item_changes ON public.action_plan_items;
CREATE TRIGGER audit_action_plan_item_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.action_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_privacy_operation();

COMMIT;

-- Read-only verification.
SELECT
  table_row.relname AS table_name,
  table_row.relrowsecurity AS rls_enabled,
  count(policy.policyname) AS policy_count
FROM pg_catalog.pg_class AS table_row
JOIN pg_catalog.pg_namespace AS table_schema ON table_schema.oid = table_row.relnamespace
LEFT JOIN pg_catalog.pg_policies AS policy
  ON policy.schemaname = table_schema.nspname AND policy.tablename = table_row.relname
WHERE table_schema.nspname = 'public'
  AND table_row.relname IN ('readiness_assessments', 'action_plan_items')
GROUP BY table_row.relname, table_row.relrowsecurity
ORDER BY table_row.relname;

SELECT
  trigger_row.event_object_table AS table_name,
  trigger_row.trigger_name,
  trigger_row.event_manipulation
FROM information_schema.triggers AS trigger_row
WHERE trigger_row.trigger_schema = 'public'
  AND trigger_row.trigger_name IN (
    'audit_readiness_assessment_changes',
    'audit_action_plan_item_changes'
  )
ORDER BY trigger_row.event_object_table, trigger_row.event_manipulation;
