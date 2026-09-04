-- Phase 2 security verification (read-only).
-- Run any numbered section independently in the Supabase SQL Editor.
-- Every statement is SELECT-only and makes no database changes.

-- ============================================================================
-- 1. RLS STATUS
-- Expected: rls_enabled = true for all four tables.
-- ============================================================================
WITH expected_tables(table_name) AS (
  VALUES
    ('organisations'::text),
    ('organisation_memberships'::text),
    ('organisation_settings'::text),
    ('audit_logs'::text)
)
SELECT
  expected.table_name,
  coalesce(table_row.relrowsecurity, false) AS rls_enabled,
  coalesce(table_row.relforcerowsecurity, false) AS rls_forced,
  table_row.oid IS NOT NULL AS table_exists,
  table_row.oid IS NOT NULL AND table_row.relrowsecurity AS pass
FROM expected_tables AS expected
LEFT JOIN pg_catalog.pg_namespace AS table_schema
  ON table_schema.nspname = 'public'
LEFT JOIN pg_catalog.pg_class AS table_row
  ON table_row.relnamespace = table_schema.oid
 AND table_row.relname = expected.table_name
 AND table_row.relkind IN ('r', 'p')
ORDER BY expected.table_name;

-- ============================================================================
-- 2. organisation_memberships POLICIES
-- Review every policy's command, role, USING expression, and WITH CHECK.
-- ============================================================================
SELECT
  policyname AS policy_name,
  cmd AS command,
  roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organisation_memberships'
ORDER BY policyname;

-- ============================================================================
-- 3. FUNCTION EXECUTION PRIVILEGES
-- Expected: PUBLIC=false, anon=false, authenticated=true for every function.
-- ACLs are inspected directly; this does not execute any function.
-- ============================================================================
WITH expected_functions(function_name, function_signature) AS (
  VALUES
    ('insert_audit_log'::text, 'public.insert_audit_log(uuid,uuid,text,text,text,text,text,jsonb)'::text),
    ('manage_membership'::text, 'public.manage_membership(uuid,uuid,text,text)'::text),
    ('get_org_members'::text, 'public.get_org_members(uuid)'::text)
), target_functions AS (
  SELECT
    expected.function_name,
    expected.function_signature,
    function_row.oid,
    function_row.proowner,
    function_row.proacl
  FROM expected_functions AS expected
  LEFT JOIN pg_catalog.pg_namespace AS function_schema
    ON function_schema.nspname = 'public'
  LEFT JOIN pg_catalog.pg_proc AS function_row
    ON function_row.oid = to_regprocedure(expected.function_signature)
   AND function_row.pronamespace = function_schema.oid
), execute_acl AS (
  SELECT target.oid, acl.grantee
  FROM target_functions AS target
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    coalesce(target.proacl, pg_catalog.acldefault('f', target.proowner))
  ) AS acl
  WHERE target.oid IS NOT NULL
    AND acl.privilege_type = 'EXECUTE'
)
SELECT
  target.function_signature,
  target.oid IS NOT NULL AS function_exists,
  EXISTS (
    SELECT 1 FROM execute_acl
    WHERE execute_acl.oid = target.oid AND execute_acl.grantee = 0
  ) AS public_can_execute,
  EXISTS (
    SELECT 1 FROM execute_acl
    WHERE execute_acl.oid = target.oid
      AND execute_acl.grantee = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'anon')
  ) AS anon_can_execute,
  EXISTS (
    SELECT 1 FROM execute_acl
    WHERE execute_acl.oid = target.oid
      AND execute_acl.grantee = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')
  ) AS authenticated_can_execute,
  target.oid IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM execute_acl
      WHERE execute_acl.oid = target.oid AND execute_acl.grantee = 0
    )
    AND NOT EXISTS (
      SELECT 1 FROM execute_acl
      WHERE execute_acl.oid = target.oid
        AND execute_acl.grantee = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'anon')
    )
    AND EXISTS (
      SELECT 1 FROM execute_acl
      WHERE execute_acl.oid = target.oid
        AND execute_acl.grantee = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')
    ) AS pass
FROM target_functions AS target
ORDER BY target.function_name;

-- ============================================================================
-- 4. DIRECT TABLE PRIVILEGES
-- Reports effective table-level DML grants. A true value does not bypass RLS.
-- ============================================================================
SELECT
  'authenticated'::text AS role_name,
  privilege.operation,
  pg_catalog.has_table_privilege(
    'authenticated',
    'public.organisation_memberships',
    privilege.operation
  ) AS has_table_privilege,
  (SELECT relrowsecurity
   FROM pg_catalog.pg_class AS table_row
   JOIN pg_catalog.pg_namespace AS table_schema ON table_schema.oid = table_row.relnamespace
   WHERE table_schema.nspname = 'public'
     AND table_row.relname = 'organisation_memberships') AS rls_enabled
FROM (VALUES ('INSERT'), ('UPDATE'), ('DELETE')) AS privilege(operation)
ORDER BY privilege.operation;

-- ============================================================================
-- 5A. NOT NULL CONSTRAINT
-- Expected: user_id is_nullable = NO.
-- ============================================================================
SELECT
  columns.table_schema,
  columns.table_name,
  columns.column_name,
  columns.is_nullable,
  columns.is_nullable = 'NO' AS pass
FROM information_schema.columns
WHERE columns.table_schema = 'public'
  AND columns.table_name = 'organisation_memberships'
  AND columns.column_name = 'user_id';

-- ============================================================================
-- 5B. UNIQUE MEMBERSHIP CONSTRAINT
-- Expected: one UNIQUE constraint on (organisation_id, user_id), in that order.
-- ============================================================================
WITH unique_constraints AS (
  SELECT
    constraint_row.conname AS constraint_name,
    array_agg(attribute.attname::text ORDER BY key_column.ordinality) AS constrained_columns
  FROM pg_catalog.pg_constraint AS constraint_row
  JOIN pg_catalog.pg_class AS table_row ON table_row.oid = constraint_row.conrelid
  JOIN pg_catalog.pg_namespace AS table_schema ON table_schema.oid = table_row.relnamespace
  CROSS JOIN LATERAL unnest(constraint_row.conkey)
    WITH ORDINALITY AS key_column(attribute_number, ordinality)
  JOIN pg_catalog.pg_attribute AS attribute
    ON attribute.attrelid = table_row.oid
   AND attribute.attnum = key_column.attribute_number
  WHERE table_schema.nspname = 'public'
    AND table_row.relname = 'organisation_memberships'
    AND constraint_row.contype = 'u'
  GROUP BY constraint_row.conname
)
SELECT
  constraint_name,
  constrained_columns,
  constrained_columns = ARRAY['organisation_id', 'user_id']::text[] AS pass
FROM unique_constraints
ORDER BY constraint_name;

-- ============================================================================
-- 6. FOREIGN KEYS
-- Expected relationships:
--   organisation_memberships.organisation_id -> public.organisations.id
--   organisation_memberships.user_id         -> auth.users.id
--   audit_logs.organisation_id                -> public.organisations.id
-- ============================================================================
WITH expected_foreign_keys(
  source_schema, source_table, source_column,
  target_schema, target_table, target_column
) AS (
  VALUES
    ('public', 'organisation_memberships', 'organisation_id', 'public', 'organisations', 'id'),
    ('public', 'organisation_memberships', 'user_id', 'auth', 'users', 'id'),
    ('public', 'audit_logs', 'organisation_id', 'public', 'organisations', 'id')
), actual_foreign_keys AS (
  SELECT
    source_schema.nspname AS source_schema,
    source_table.relname AS source_table,
    source_column.attname AS source_column,
    target_schema.nspname AS target_schema,
    target_table.relname AS target_table,
    target_column.attname AS target_column,
    constraint_row.conname AS constraint_name
  FROM pg_catalog.pg_constraint AS constraint_row
  JOIN pg_catalog.pg_class AS source_table ON source_table.oid = constraint_row.conrelid
  JOIN pg_catalog.pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
  JOIN pg_catalog.pg_class AS target_table ON target_table.oid = constraint_row.confrelid
  JOIN pg_catalog.pg_namespace AS target_schema ON target_schema.oid = target_table.relnamespace
  CROSS JOIN LATERAL unnest(constraint_row.conkey)
    WITH ORDINALITY AS source_key(attribute_number, ordinality)
  CROSS JOIN LATERAL unnest(constraint_row.confkey)
    WITH ORDINALITY AS target_key(attribute_number, ordinality)
  JOIN pg_catalog.pg_attribute AS source_column
    ON source_column.attrelid = source_table.oid
   AND source_column.attnum = source_key.attribute_number
  JOIN pg_catalog.pg_attribute AS target_column
    ON target_column.attrelid = target_table.oid
   AND target_column.attnum = target_key.attribute_number
   AND target_key.ordinality = source_key.ordinality
  WHERE constraint_row.contype = 'f'
)
SELECT
  expected.source_schema,
  expected.source_table,
  expected.source_column,
  expected.target_schema,
  expected.target_table,
  expected.target_column,
  actual.constraint_name,
  actual.constraint_name IS NOT NULL AS pass
FROM expected_foreign_keys AS expected
LEFT JOIN actual_foreign_keys AS actual
  ON actual.source_schema = expected.source_schema
 AND actual.source_table = expected.source_table
 AND actual.source_column = expected.source_column
 AND actual.target_schema = expected.target_schema
 AND actual.target_table = expected.target_table
 AND actual.target_column = expected.target_column
ORDER BY expected.source_table, expected.source_column;

-- ============================================================================
-- 7. SECURITY DEFINER FUNCTIONS AND search_path
-- Expected for application SECURITY DEFINER functions: search_path=public, pg_temp.
-- ============================================================================
SELECT
  function_schema.nspname AS function_schema,
  function_row.oid::regprocedure AS function_signature,
  pg_catalog.pg_get_userbyid(function_row.proowner) AS function_owner,
  coalesce(
    (SELECT setting
     FROM unnest(coalesce(function_row.proconfig, ARRAY[]::text[])) AS setting
     WHERE setting LIKE 'search_path=%'),
    '<not configured>'
  ) AS configured_search_path,
  EXISTS (
    SELECT 1
    FROM unnest(coalesce(function_row.proconfig, ARRAY[]::text[])) AS setting
    WHERE regexp_replace(setting, '\s+', '', 'g') = 'search_path=public,pg_temp'
  ) AS pass
FROM pg_catalog.pg_proc AS function_row
JOIN pg_catalog.pg_namespace AS function_schema
  ON function_schema.oid = function_row.pronamespace
WHERE function_row.prosecdef
  AND function_schema.nspname = 'public'
ORDER BY function_schema.nspname, function_row.oid::regprocedure::text;

-- ============================================================================
-- 8. manage_membership SECURITY CHECKS
-- Inspects the live function body; it does not invoke the function.
-- ============================================================================
WITH managed_function AS (
  SELECT
    function_row.oid::regprocedure AS function_signature,
    pg_catalog.pg_get_functiondef(function_row.oid) AS function_definition
  FROM pg_catalog.pg_proc AS function_row
  WHERE function_row.oid = to_regprocedure('public.manage_membership(uuid,uuid,text,text)')
)
SELECT
  function_signature,
  function_definition,
  position('v_actor_id uuid := auth.uid()' in lower(function_definition)) > 0
    AS derives_actor_from_auth_uid,
  position('membership.organisation_id = p_org_id' in function_definition) > 0
    AND position('membership.user_id = v_actor_id' in function_definition) > 0
    AS verifies_actor_organisation_membership,
  position('members.manage permission is required' in function_definition) > 0
    AND position('Organisation Owner' in function_definition) > 0
    AND position('Privacy Admin' in function_definition) > 0
    AS verifies_members_manage_permission,
  position('v_actor_id = p_target_user_id' in function_definition) > 0
    AND position('Self-promotion or self-role changes are not permitted' in function_definition) > 0
    AS blocks_self_promotion,
  position('Cross-organisation membership modification rejected' in function_definition) > 0
    AS blocks_cross_organisation_changes,
  position('FOR UPDATE' in function_definition) > 0
    AND position('Cannot remove, deactivate, or demote the last Organisation Owner' in function_definition) > 0
    AS protects_last_organisation_owner,
  position('public.insert_audit_log' in function_definition) > 0
    AS creates_audit_log_record,
  position('p_actor_user_id' in function_definition) = 0
    AS does_not_accept_client_actor_identity
FROM managed_function;

-- ============================================================================
-- 9. FINAL PASS/FAIL SUMMARY
-- One row per security requirement. This query is fully self-contained.
-- Table-level DML grants do not bypass RLS; the direct-write check therefore
-- verifies RLS plus the absence of permissive UPDATE/DELETE policies and requires
-- the INSERT policy to have WITH CHECK false.
-- ============================================================================
WITH
target_tables(table_name) AS (
  VALUES ('organisations'), ('organisation_memberships'),
         ('organisation_settings'), ('audit_logs')
),
rls_checks AS (
  SELECT
    target.table_name,
    coalesce(table_row.relrowsecurity, false) AS enabled
  FROM target_tables AS target
  LEFT JOIN pg_catalog.pg_namespace AS table_schema ON table_schema.nspname = 'public'
  LEFT JOIN pg_catalog.pg_class AS table_row
    ON table_row.relnamespace = table_schema.oid
   AND table_row.relname = target.table_name
   AND table_row.relkind IN ('r', 'p')
),
expected_functions(function_name, function_signature) AS (
  VALUES
    ('insert_audit_log'::text, 'public.insert_audit_log(uuid,uuid,text,text,text,text,text,jsonb)'::text),
    ('manage_membership'::text, 'public.manage_membership(uuid,uuid,text,text)'::text),
    ('get_org_members'::text, 'public.get_org_members(uuid)'::text)
),
target_functions AS (
  SELECT expected.function_name, expected.function_signature,
         function_row.oid, function_row.proowner, function_row.proacl
  FROM expected_functions AS expected
  LEFT JOIN pg_catalog.pg_namespace AS function_schema ON function_schema.nspname = 'public'
  LEFT JOIN pg_catalog.pg_proc AS function_row
    ON function_row.oid = to_regprocedure(expected.function_signature)
   AND function_row.pronamespace = function_schema.oid
),
execute_acl AS (
  SELECT target.oid, acl.grantee
  FROM target_functions AS target
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    coalesce(target.proacl, pg_catalog.acldefault('f', target.proowner))
  ) AS acl
  WHERE target.oid IS NOT NULL AND acl.privilege_type = 'EXECUTE'
),
function_privilege_checks AS (
  SELECT
    target.function_name,
    EXISTS (SELECT 1 FROM execute_acl WHERE oid = target.oid AND grantee = 0)
      AS public_can_execute,
    EXISTS (
        SELECT 1 FROM execute_acl WHERE oid = target.oid
          AND grantee = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'anon')
      ) AS anon_can_execute,
    EXISTS (
        SELECT 1 FROM execute_acl WHERE oid = target.oid
          AND grantee = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')
      ) AS authenticated_can_execute,
    target.oid IS NOT NULL AS function_exists
  FROM target_functions AS target
),
membership_column AS (
  SELECT columns.is_nullable
  FROM information_schema.columns
  WHERE columns.table_schema = 'public'
    AND columns.table_name = 'organisation_memberships'
    AND columns.column_name = 'user_id'
),
membership_unique AS (
  SELECT array_agg(attribute.attname::text ORDER BY key_column.ordinality) AS columns
  FROM pg_catalog.pg_constraint AS constraint_row
  JOIN pg_catalog.pg_class AS table_row ON table_row.oid = constraint_row.conrelid
  JOIN pg_catalog.pg_namespace AS table_schema ON table_schema.oid = table_row.relnamespace
  CROSS JOIN LATERAL unnest(constraint_row.conkey)
    WITH ORDINALITY AS key_column(attribute_number, ordinality)
  JOIN pg_catalog.pg_attribute AS attribute
    ON attribute.attrelid = table_row.oid AND attribute.attnum = key_column.attribute_number
  WHERE table_schema.nspname = 'public'
    AND table_row.relname = 'organisation_memberships'
    AND constraint_row.contype = 'u'
  GROUP BY constraint_row.conname
),
required_foreign_keys(check_name, source_table, source_column, target_schema, target_table) AS (
  VALUES
    ('memberships organisation FK', 'organisation_memberships', 'organisation_id', 'public', 'organisations'),
    ('memberships auth user FK', 'organisation_memberships', 'user_id', 'auth', 'users'),
    ('audit logs organisation FK', 'audit_logs', 'organisation_id', 'public', 'organisations')
),
foreign_key_checks AS (
  SELECT required.check_name, EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS constraint_row
    JOIN pg_catalog.pg_class AS source_table ON source_table.oid = constraint_row.conrelid
    JOIN pg_catalog.pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
    JOIN pg_catalog.pg_class AS target_table ON target_table.oid = constraint_row.confrelid
    JOIN pg_catalog.pg_namespace AS target_schema ON target_schema.oid = target_table.relnamespace
    CROSS JOIN LATERAL unnest(constraint_row.conkey) AS source_key(attribute_number)
    JOIN pg_catalog.pg_attribute AS source_column
      ON source_column.attrelid = source_table.oid
     AND source_column.attnum = source_key.attribute_number
    WHERE constraint_row.contype = 'f'
      AND source_schema.nspname = 'public'
      AND source_table.relname = required.source_table
      AND source_column.attname = required.source_column
      AND target_schema.nspname = required.target_schema
      AND target_table.relname = required.target_table
  ) AS valid
  FROM required_foreign_keys AS required
),
definer_search_paths AS (
  SELECT bool_and(EXISTS (
    SELECT 1 FROM unnest(coalesce(function_row.proconfig, ARRAY[]::text[])) AS setting
    WHERE regexp_replace(setting, '\s+', '', 'g') = 'search_path=public,pg_temp'
  )) AS valid
  FROM pg_catalog.pg_proc AS function_row
  JOIN pg_catalog.pg_namespace AS function_schema ON function_schema.oid = function_row.pronamespace
  WHERE function_row.prosecdef
    AND function_schema.nspname = 'public'
),
managed_function AS (
  SELECT pg_catalog.pg_get_functiondef(function_row.oid) AS definition
  FROM pg_catalog.pg_proc AS function_row
  WHERE function_row.oid = to_regprocedure('public.manage_membership(uuid,uuid,text,text)')
),
summary(check_name, expected_result, actual_result, pass) AS (
  SELECT 'RLS enabled: ' || table_name, 'true', enabled::text, enabled
  FROM rls_checks
  UNION ALL
  SELECT 'Secure EXECUTE ACL: ' || function_name,
         'PUBLIC=false, anon=false, authenticated=true',
         'PUBLIC=' || public_can_execute::text
           || ', anon=' || anon_can_execute::text
           || ', authenticated=' || authenticated_can_execute::text,
         function_exists
           AND NOT public_can_execute
           AND NOT anon_can_execute
           AND authenticated_can_execute
  FROM function_privilege_checks
  UNION ALL
  SELECT 'Membership direct writes constrained by RLS',
         'RLS enabled; no UPDATE/DELETE policy; INSERT WITH CHECK false',
         'catalog policies inspected',
         (SELECT enabled FROM rls_checks WHERE table_name = 'organisation_memberships')
         AND NOT EXISTS (
           SELECT 1 FROM pg_catalog.pg_policies
           WHERE schemaname = 'public' AND tablename = 'organisation_memberships'
             AND cmd IN ('UPDATE', 'DELETE', 'ALL')
         )
         AND EXISTS (
           SELECT 1 FROM pg_catalog.pg_policies
           WHERE schemaname = 'public' AND tablename = 'organisation_memberships'
             AND cmd = 'INSERT' AND lower(with_check) = 'false'
         )
  UNION ALL
  SELECT 'organisation_memberships.user_id NOT NULL', 'true',
         coalesce((SELECT (is_nullable = 'NO')::text FROM membership_column), 'false'),
         coalesce((SELECT is_nullable = 'NO' FROM membership_column), false)
  UNION ALL
  SELECT 'Unique membership per organisation and user', 'true',
         EXISTS (SELECT 1 FROM membership_unique
                 WHERE columns = ARRAY['organisation_id', 'user_id']::text[])::text,
         EXISTS (SELECT 1 FROM membership_unique
                 WHERE columns = ARRAY['organisation_id', 'user_id']::text[])
  UNION ALL
  SELECT check_name, 'foreign key exists', valid::text, valid FROM foreign_key_checks
  UNION ALL
  SELECT 'SECURITY DEFINER search_path', 'all public functions configured as public, pg_temp',
         coalesce(valid, false)::text, coalesce(valid, false) FROM definer_search_paths
  UNION ALL
  SELECT 'manage_membership derives actor from auth.uid()', 'true',
         (position('v_actor_id uuid := auth.uid()' in lower(definition)) > 0)::text,
         position('v_actor_id uuid := auth.uid()' in lower(definition)) > 0
  FROM managed_function
  UNION ALL
  SELECT 'manage_membership verifies actor organisation membership', 'true',
         (position('membership.organisation_id = p_org_id' in definition) > 0
          AND position('membership.user_id = v_actor_id' in definition) > 0)::text,
         position('membership.organisation_id = p_org_id' in definition) > 0
          AND position('membership.user_id = v_actor_id' in definition) > 0
  FROM managed_function
  UNION ALL
  SELECT 'manage_membership verifies members.manage permission', 'true',
         (position('members.manage permission is required' in definition) > 0)::text,
         position('members.manage permission is required' in definition) > 0
  FROM managed_function
  UNION ALL
  SELECT 'manage_membership blocks self-promotion', 'true',
         (position('Self-promotion or self-role changes are not permitted' in definition) > 0)::text,
         position('Self-promotion or self-role changes are not permitted' in definition) > 0
  FROM managed_function
  UNION ALL
  SELECT 'manage_membership blocks cross-organisation changes', 'true',
         (position('Cross-organisation membership modification rejected' in definition) > 0)::text,
         position('Cross-organisation membership modification rejected' in definition) > 0
  FROM managed_function
  UNION ALL
  SELECT 'manage_membership protects last Organisation Owner', 'true',
         (position('Cannot remove, deactivate, or demote the last Organisation Owner' in definition) > 0)::text,
         position('Cannot remove, deactivate, or demote the last Organisation Owner' in definition) > 0
  FROM managed_function
  UNION ALL
  SELECT 'manage_membership creates audit log', 'true',
         (position('public.insert_audit_log' in definition) > 0)::text,
         position('public.insert_audit_log' in definition) > 0
  FROM managed_function
  UNION ALL
  SELECT 'manage_membership accepts no client actor identity', 'true',
         (position('p_actor_user_id' in definition) = 0)::text,
         position('p_actor_user_id' in definition) = 0
  FROM managed_function
)
SELECT check_name, expected_result, actual_result, pass
FROM summary
ORDER BY check_name;
