-- Migration 005: pin application SECURITY DEFINER search paths.
-- Idempotent: repeating ALTER FUNCTION ... SET replaces the same configuration.
-- Function bodies, signatures, owners, grants, RLS, and policies are unchanged.

BEGIN;

ALTER FUNCTION public.handle_new_user()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.handle_new_organisation()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.insert_audit_log(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.manage_membership(UUID, UUID, TEXT, TEXT)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_org_members(UUID)
  SET search_path = public, pg_temp;

COMMIT;

-- Read-only verification. Expected: five rows, each with pass = true.
WITH expected_functions(function_signature) AS (
  VALUES
    ('public.handle_new_user()'::text),
    ('public.handle_new_organisation()'::text),
    ('public.insert_audit_log(uuid,uuid,text,text,text,text,text,jsonb)'::text),
    ('public.manage_membership(uuid,uuid,text,text)'::text),
    ('public.get_org_members(uuid)'::text)
)
SELECT
  expected.function_signature,
  function_row.oid IS NOT NULL AS function_exists,
  coalesce(function_row.prosecdef, false) AS security_definer,
  coalesce(
    (SELECT setting
     FROM unnest(coalesce(function_row.proconfig, ARRAY[]::text[])) AS setting
     WHERE setting LIKE 'search_path=%'),
    '<not configured>'
  ) AS configured_search_path,
  function_row.oid IS NOT NULL
    AND function_row.prosecdef
    AND EXISTS (
      SELECT 1
      FROM unnest(coalesce(function_row.proconfig, ARRAY[]::text[])) AS setting
      WHERE regexp_replace(setting, '\s+', '', 'g') = 'search_path=public,pg_temp'
    ) AS pass
FROM expected_functions AS expected
LEFT JOIN pg_catalog.pg_proc AS function_row
  ON function_row.oid = to_regprocedure(expected.function_signature)
ORDER BY expected.function_signature;

-- Read-only privilege confirmation for externally callable Phase 2 RPCs.
-- Expected: PUBLIC=false, anon=false, authenticated=true for all three rows.
WITH expected_functions(function_signature) AS (
  VALUES
    ('public.insert_audit_log(uuid,uuid,text,text,text,text,text,jsonb)'::text),
    ('public.manage_membership(uuid,uuid,text,text)'::text),
    ('public.get_org_members(uuid)'::text)
), target_functions AS (
  SELECT expected.function_signature, function_row.oid,
         function_row.proowner, function_row.proacl
  FROM expected_functions AS expected
  LEFT JOIN pg_catalog.pg_proc AS function_row
    ON function_row.oid = to_regprocedure(expected.function_signature)
), execute_acl AS (
  SELECT target.oid, acl.grantee
  FROM target_functions AS target
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    coalesce(target.proacl, pg_catalog.acldefault('f', target.proowner))
  ) AS acl
  WHERE target.oid IS NOT NULL AND acl.privilege_type = 'EXECUTE'
)
SELECT
  target.function_signature,
  EXISTS (SELECT 1 FROM execute_acl WHERE oid = target.oid AND grantee = 0)
    AS public_can_execute,
  EXISTS (
    SELECT 1 FROM execute_acl WHERE oid = target.oid
      AND grantee = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'anon')
  ) AS anon_can_execute,
  EXISTS (
    SELECT 1 FROM execute_acl WHERE oid = target.oid
      AND grantee = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')
  ) AS authenticated_can_execute
FROM target_functions AS target
ORDER BY target.function_signature;
