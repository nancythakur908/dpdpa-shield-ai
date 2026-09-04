-- Migration 003: repair audit logging and membership security.
-- Idempotent after a full or partially executed migration 002.
-- Copy this entire file into the Supabase SQL Editor and run it as one query.

BEGIN;

ALTER TABLE public.organisation_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Remove every policy name used by schema.sql and migration 002 before rebuilding
-- the small, non-recursive policy set.
DROP POLICY IF EXISTS "Members can read own memberships" ON public.organisation_memberships;
DROP POLICY IF EXISTS "Members can read org memberships" ON public.organisation_memberships;
DROP POLICY IF EXISTS "Owners and admins can insert memberships" ON public.organisation_memberships;
DROP POLICY IF EXISTS "Owners and admins can update memberships" ON public.organisation_memberships;
DROP POLICY IF EXISTS "No direct client inserts to memberships" ON public.organisation_memberships;
DROP POLICY IF EXISTS "Users can read own membership row" ON public.organisation_memberships;

CREATE POLICY "Users can read own membership row"
  ON public.organisation_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "No direct client inserts to memberships"
  ON public.organisation_memberships FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Authorised members can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "No direct client inserts to audit_logs" ON public.audit_logs;

CREATE POLICY "Authorised members can read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_memberships AS membership
      WHERE membership.organisation_id = audit_logs.organisation_id
        AND membership.user_id = auth.uid()
        AND membership.is_active
        AND membership.role IN (
          'Organisation Owner', 'Privacy Admin', 'Privacy Lead', 'Auditor'
        )
    )
  );

CREATE POLICY "No direct client inserts to audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (false);

-- The eight arguments are the contract already used by dbStoreReal.js. The two
-- claimed actor fields are retained for compatibility, but are never trusted.
DROP FUNCTION IF EXISTS public.insert_audit_log(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);
CREATE FUNCTION public.insert_audit_log(
  p_organisation_id UUID,
  p_actor_user_id UUID,
  p_actor_email TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_result TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_email TEXT := auth.jwt() ->> 'email';
  v_log_id UUID;
  v_key TEXT;
  v_value JSONB;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated.' USING ERRCODE = '42501';
  END IF;

  IF p_actor_user_id IS NOT NULL AND p_actor_user_id <> v_actor_id THEN
    RAISE EXCEPTION 'Forged actor identity rejected.' USING ERRCODE = '42501';
  END IF;

  IF p_actor_email IS NOT NULL
     AND (v_actor_email IS NULL OR lower(p_actor_email) <> lower(v_actor_email)) THEN
    RAISE EXCEPTION 'Forged actor identity rejected.' USING ERRCODE = '42501';
  END IF;

  IF p_organisation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.organisation_memberships AS membership
    WHERE membership.organisation_id = p_organisation_id
      AND membership.user_id = v_actor_id
      AND membership.is_active
  ) THEN
    RAISE EXCEPTION 'Cross-organisation audit write rejected.' USING ERRCODE = '42501';
  END IF;

  IF p_action IS NULL OR btrim(p_action) = '' OR length(p_action) > 120 THEN
    RAISE EXCEPTION 'Invalid audit action.' USING ERRCODE = '22023';
  END IF;
  IF p_result NOT IN ('Success', 'Failure', 'Denied') THEN
    RAISE EXCEPTION 'Invalid audit result.' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(p_entity_type, '')) > 120 OR length(coalesce(p_entity_id, '')) > 255 THEN
    RAISE EXCEPTION 'Audit entity fields are too long.' USING ERRCODE = '22023';
  END IF;

  p_metadata := coalesce(p_metadata, '{}'::JSONB);
  IF jsonb_typeof(p_metadata) <> 'object' OR octet_length(p_metadata::TEXT) > 4096 THEN
    RAISE EXCEPTION 'Audit metadata must be a small JSON object.' USING ERRCODE = '22023';
  END IF;

  -- Metadata is intentionally allow-listed and scalar. This prevents credentials,
  -- tokens, arbitrary request bodies, and full sensitive records entering the log.
  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_metadata)
  LOOP
    IF v_key NOT IN (
      'permission', 'role', 'email', 'fields', 'keys', 'newRole', 'action',
      'new_role', 'target_user_id', 'actor_role', 'reason'
    ) THEN
      RAISE EXCEPTION 'Audit metadata key "%" is not permitted.', v_key USING ERRCODE = '22023';
    END IF;
    IF v_key ~* '(password|secret|token|authorization|cookie|credential|session)' THEN
      RAISE EXCEPTION 'Sensitive audit metadata is not permitted.' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(v_value) IN ('object')
       OR (jsonb_typeof(v_value) = 'array' AND v_key NOT IN ('fields', 'keys')) THEN
      RAISE EXCEPTION 'Nested or record-shaped audit metadata is not permitted.' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF p_metadata::TEXT ~* '(password|secret|access[_ -]?token|authorization|cookie|credential|session[_ -]?key)' THEN
    RAISE EXCEPTION 'Sensitive audit metadata is not permitted.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_logs (
    organisation_id, actor_user_id, actor_email, action,
    entity_type, entity_id, result, metadata
  )
  VALUES (
    p_organisation_id, v_actor_id, v_actor_email, p_action,
    p_entity_type, p_entity_id, p_result, p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_audit_log(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insert_audit_log(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.insert_audit_log(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

DROP FUNCTION IF EXISTS public.manage_membership(UUID, UUID, TEXT, TEXT);
CREATE FUNCTION public.manage_membership(
  p_org_id UUID,
  p_target_user_id UUID,
  p_action TEXT,
  p_role TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_target_role TEXT;
  v_target_active BOOLEAN;
  v_affected INTEGER;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated.' USING ERRCODE = '42501';
  END IF;
  IF p_org_id IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Organisation and target user are required.' USING ERRCODE = '22023';
  END IF;
  IF p_action NOT IN ('invite', 'remove', 'deactivate', 'change_role') THEN
    RAISE EXCEPTION 'Invalid membership action.' USING ERRCODE = '22023';
  END IF;
  IF p_action IN ('invite', 'change_role') AND p_role NOT IN (
    'Organisation Owner', 'Privacy Admin', 'Privacy Lead', 'Legal Reviewer',
    'Security Lead', 'Department Owner', 'Auditor', 'Viewer'
  ) THEN
    RAISE EXCEPTION 'Invalid membership role.' USING ERRCODE = '22023';
  END IF;

  SELECT membership.role
  INTO v_actor_role
  FROM public.organisation_memberships AS membership
  WHERE membership.organisation_id = p_org_id
    AND membership.user_id = v_actor_id
    AND membership.is_active
  FOR UPDATE;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Cross-organisation membership modification rejected.' USING ERRCODE = '42501';
  END IF;

  -- Database-side definition of the members.manage permission.
  IF v_actor_role NOT IN ('Organisation Owner', 'Privacy Admin') THEN
    RAISE EXCEPTION 'Access denied. members.manage permission is required.' USING ERRCODE = '42501';
  END IF;

  SELECT membership.role, membership.is_active
  INTO v_target_role, v_target_active
  FROM public.organisation_memberships AS membership
  WHERE membership.organisation_id = p_org_id
    AND membership.user_id = p_target_user_id
  FOR UPDATE;

  IF p_action <> 'invite' AND v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target is not a member of this organisation.' USING ERRCODE = 'P0002';
  END IF;

  -- No caller may alter their own role; this blocks every form of self-promotion.
  IF v_actor_id = p_target_user_id AND p_action IN ('change_role', 'invite') THEN
    RAISE EXCEPTION 'Self-promotion or self-role changes are not permitted.' USING ERRCODE = '42501';
  END IF;
  IF v_actor_id = p_target_user_id AND p_action IN ('remove', 'deactivate') THEN
    RAISE EXCEPTION 'Self-removal or self-deactivation is not permitted.' USING ERRCODE = '42501';
  END IF;

  IF p_role = 'Organisation Owner' AND v_actor_role <> 'Organisation Owner' THEN
    RAISE EXCEPTION 'Only an Organisation Owner can assign that role.' USING ERRCODE = '42501';
  END IF;

  -- Lock every active owner row so concurrent demotions cannot both pass.
  IF v_target_role = 'Organisation Owner'
     AND (p_action IN ('remove', 'deactivate')
          OR (p_action = 'change_role' AND p_role <> 'Organisation Owner')) THEN
    PERFORM 1
    FROM public.organisation_memberships AS owner_membership
    WHERE owner_membership.organisation_id = p_org_id
      AND owner_membership.role = 'Organisation Owner'
      AND owner_membership.is_active
    FOR UPDATE;

    IF (SELECT count(*)
        FROM public.organisation_memberships AS owner_membership
        WHERE owner_membership.organisation_id = p_org_id
          AND owner_membership.role = 'Organisation Owner'
          AND owner_membership.is_active) <= 1 THEN
      RAISE EXCEPTION 'Cannot remove, deactivate, or demote the last Organisation Owner.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF p_action = 'invite' THEN
    INSERT INTO public.organisation_memberships (organisation_id, user_id, role, is_active)
    VALUES (p_org_id, p_target_user_id, p_role, true)
    ON CONFLICT (organisation_id, user_id) DO UPDATE
      SET role = EXCLUDED.role, is_active = true, updated_at = now();
  ELSIF p_action = 'remove' THEN
    DELETE FROM public.organisation_memberships
    WHERE organisation_id = p_org_id AND user_id = p_target_user_id;
  ELSIF p_action = 'deactivate' THEN
    UPDATE public.organisation_memberships
    SET is_active = false, updated_at = now()
    WHERE organisation_id = p_org_id AND user_id = p_target_user_id;
  ELSE
    UPDATE public.organisation_memberships
    SET role = p_role, updated_at = now()
    WHERE organisation_id = p_org_id AND user_id = p_target_user_id;
  END IF;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> 1 THEN
    RAISE EXCEPTION 'Membership action did not affect exactly one row.';
  END IF;

  PERFORM public.insert_audit_log(
    p_org_id, v_actor_id, NULL, 'membership.' || p_action, 'Membership',
    p_target_user_id::TEXT, 'Success',
    jsonb_build_object('action', p_action, 'new_role', p_role,
                       'target_user_id', p_target_user_id, 'actor_role', v_actor_role)
  );

  RETURN jsonb_build_object('success', true, 'action', p_action, 'org_id', p_org_id);
END;
$$;

REVOKE ALL ON FUNCTION public.manage_membership(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.manage_membership(UUID, UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.manage_membership(UUID, UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_org_members(p_org_id UUID)
RETURNS TABLE (
  user_id UUID, role TEXT, is_active BOOLEAN, full_name TEXT,
  email TEXT, avatar_initials TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organisation_memberships AS actor_membership
    WHERE actor_membership.organisation_id = p_org_id
      AND actor_membership.user_id = auth.uid()
      AND actor_membership.is_active
  ) THEN
    RAISE EXCEPTION 'Cross-organisation member read rejected.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT membership.user_id, membership.role, membership.is_active,
         profile.full_name, profile.email, profile.avatar_initials, membership.created_at
  FROM public.organisation_memberships AS membership
  JOIN public.user_profiles AS profile ON profile.id = membership.user_id
  WHERE membership.organisation_id = p_org_id
  ORDER BY membership.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_members(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_org_members(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_org_members(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.create_owner_membership(UUID, UUID);

COMMIT;

-- Verification queries (read-only). Their result sets show the deployed state.
SELECT p.oid::regprocedure AS audit_function_signature,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'insert_audit_log';

SELECT routine_schema, routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('insert_audit_log', 'manage_membership', 'get_org_members')
ORDER BY routine_name, grantee;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('organisation_memberships', 'audit_logs')
ORDER BY tablename, policyname;

SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('organisation_memberships', 'audit_logs');

SELECT p.oid::regprocedure AS function_signature,
       pg_get_userbyid(p.proowner) AS owner,
       p.proconfig AS function_settings
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
ORDER BY p.oid::regprocedure::TEXT;
