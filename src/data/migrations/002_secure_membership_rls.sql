-- ============================================================
-- PrivSecure India — Migration 002: Secure Membership RLS
-- File: src/data/migrations/002_secure_membership_rls.sql
-- Run in Supabase SQL Editor AFTER schema.sql.
-- This replaces the recursive and privilege-escalating policies.
-- ============================================================

-- ─── STEP 1: Drop ALL existing membership policies ────────────────────────────
-- Both the recursive ones and any UPDATE policy that allows self-promotion.
DROP POLICY IF EXISTS "Members can read own memberships"          ON public.organisation_memberships;
DROP POLICY IF EXISTS "Members can read org memberships"          ON public.organisation_memberships;
DROP POLICY IF EXISTS "Owners and admins can insert memberships"  ON public.organisation_memberships;
DROP POLICY IF EXISTS "No direct client inserts to memberships"   ON public.organisation_memberships;
DROP POLICY IF EXISTS "Owners and admins can update memberships"  ON public.organisation_memberships;

-- ─── STEP 2: Safe non-recursive SELECT policy ─────────────────────────────────
-- A user can only read their own membership row.
-- This is strictly non-recursive — does NOT reference organisation_memberships inside itself.
-- The full member list is obtained via get_org_members() RPC below.
CREATE POLICY "Users can read own membership row"
  ON public.organisation_memberships FOR SELECT
  USING (user_id = auth.uid());

-- ─── STEP 3: Block ALL direct writes from authenticated and anon clients ───────
-- INSERT is blocked for all clients.
CREATE POLICY "No direct client inserts to memberships"
  ON public.organisation_memberships FOR INSERT
  WITH CHECK (FALSE);

-- No UPDATE or DELETE policy is created — RLS denies them by default.
-- All membership mutations go through manage_membership() SECURITY DEFINER function.

-- ─── STEP 4: manage_membership() — the ONLY way to mutate memberships ─────────
-- Called via supabase.rpc('manage_membership', {...}) using anon key + user JWT.
-- The function runs with SECURITY DEFINER so it can write to tables despite RLS.
-- All security checks happen inside the function.

CREATE OR REPLACE FUNCTION public.manage_membership(
  p_org_id          UUID,
  p_target_user_id  UUID,
  p_action          TEXT,    -- 'invite' | 'remove' | 'deactivate' | 'change_role'
  p_role            TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- prevent search-path hijacking
AS $$
DECLARE
  v_actor_id      UUID;
  v_actor_role    TEXT;
  v_target_role   TEXT;
  v_target_active BOOLEAN;
  v_owner_count   INT;
BEGIN

  -- 1. Resolve caller — never trust client-supplied user IDs
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated. No active Supabase session.';
  END IF;

  -- 2. Validate action input
  IF p_action NOT IN ('invite', 'remove', 'deactivate', 'change_role') THEN
    RAISE EXCEPTION 'Invalid action: %. Must be invite | remove | deactivate | change_role.', p_action;
  END IF;

  -- 3. Validate role value when required
  IF p_action IN ('invite', 'change_role') THEN
    IF p_role IS NULL THEN
      RAISE EXCEPTION 'p_role is required for action: %', p_action;
    END IF;
    IF p_role NOT IN (
      'Organisation Owner','Privacy Admin','Privacy Lead',
      'Legal Reviewer','Security Lead','Department Owner','Auditor','Viewer'
    ) THEN
      RAISE EXCEPTION 'Invalid role value: %', p_role;
    END IF;
  END IF;

  -- 4. Verify actor is an ACTIVE member of THIS org (cross-org protection)
  SELECT role INTO v_actor_role
  FROM public.organisation_memberships
  WHERE organisation_id = p_org_id
    AND user_id = v_actor_id
    AND is_active = TRUE;

  IF v_actor_role IS NULL THEN
    INSERT INTO public.audit_logs (organisation_id, actor_user_id, action, entity_type, entity_id, result, metadata)
    VALUES (p_org_id, v_actor_id, 'membership.' || p_action, 'Membership',
            p_target_user_id::TEXT, 'Denied',
            jsonb_build_object('reason', 'Actor is not an active member of this organisation'));
    RAISE EXCEPTION 'Access denied. You are not an active member of organisation %.', p_org_id;
  END IF;

  -- 5. Verify actor has permission to manage memberships
  IF v_actor_role NOT IN ('Organisation Owner', 'Privacy Admin') THEN
    INSERT INTO public.audit_logs (organisation_id, actor_user_id, action, entity_type, entity_id, result, metadata)
    VALUES (p_org_id, v_actor_id, 'membership.' || p_action, 'Membership',
            p_target_user_id::TEXT, 'Denied',
            jsonb_build_object('reason', 'Insufficient role', 'actor_role', v_actor_role));
    RAISE EXCEPTION 'Access denied. Role "%" cannot manage memberships.', v_actor_role;
  END IF;

  -- 6. Block self-removal and self-deactivation
  IF v_actor_id = p_target_user_id AND p_action IN ('remove', 'deactivate') THEN
    RAISE EXCEPTION 'You cannot remove or deactivate your own membership.';
  END IF;

  -- 7. Block self-promotion
  IF v_actor_id = p_target_user_id AND p_action = 'change_role' AND p_role = 'Organisation Owner' THEN
    RAISE EXCEPTION 'Self-promotion to Organisation Owner is not permitted.';
  END IF;

  -- 8. Only Organisation Owners can assign the Organisation Owner role
  IF p_role = 'Organisation Owner' AND v_actor_role != 'Organisation Owner' THEN
    INSERT INTO public.audit_logs (organisation_id, actor_user_id, action, entity_type, entity_id, result, metadata)
    VALUES (p_org_id, v_actor_id, 'membership.' || p_action, 'Membership',
            p_target_user_id::TEXT, 'Denied',
            jsonb_build_object('reason', 'Only Organisation Owner can assign Owner role'));
    RAISE EXCEPTION 'Only an Organisation Owner can assign the Organisation Owner role.';
  END IF;

  -- 9. Resolve target's current state
  SELECT role, is_active INTO v_target_role, v_target_active
  FROM public.organisation_memberships
  WHERE organisation_id = p_org_id AND user_id = p_target_user_id;

  -- 10. Last-owner protection — enforced before ANY removal or demotion
  IF p_action IN ('remove', 'deactivate')
     OR (p_action = 'change_role' AND v_target_role = 'Organisation Owner' AND p_role != 'Organisation Owner')
  THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM public.organisation_memberships
    WHERE organisation_id = p_org_id
      AND role = 'Organisation Owner'
      AND is_active = TRUE;

    IF v_owner_count <= 1 AND v_target_role = 'Organisation Owner' THEN
      RAISE EXCEPTION 'Cannot remove or demote the last Organisation Owner. Assign another owner first.';
    END IF;
  END IF;

  -- 11. Execute the action
  IF p_action = 'invite' THEN
    INSERT INTO public.organisation_memberships (organisation_id, user_id, role, is_active)
    VALUES (p_org_id, p_target_user_id, p_role, TRUE)
    ON CONFLICT (organisation_id, user_id)
      DO UPDATE SET role = EXCLUDED.role, is_active = TRUE, updated_at = now();

  ELSIF p_action = 'remove' THEN
    -- Hard delete only after last-owner check passed
    DELETE FROM public.organisation_memberships
    WHERE organisation_id = p_org_id AND user_id = p_target_user_id;

  ELSIF p_action = 'deactivate' THEN
    UPDATE public.organisation_memberships
    SET is_active = FALSE, updated_at = now()
    WHERE organisation_id = p_org_id AND user_id = p_target_user_id;

  ELSIF p_action = 'change_role' THEN
    UPDATE public.organisation_memberships
    SET role = p_role, updated_at = now()
    WHERE organisation_id = p_org_id AND user_id = p_target_user_id;
  END IF;

  -- 12. Write tamper-evident success audit log (SECURITY DEFINER bypasses audit_log RLS)
  INSERT INTO public.audit_logs (
    organisation_id, actor_user_id, action, entity_type, entity_id, result, metadata
  ) VALUES (
    p_org_id,
    v_actor_id,
    'membership.' || p_action,
    'Membership',
    p_target_user_id::TEXT,
    'Success',
    jsonb_build_object(
      'action',           p_action,
      'new_role',         p_role,
      'target_user_id',   p_target_user_id,
      'actor_role',       v_actor_role
    )
  );

  RETURN jsonb_build_object('success', TRUE, 'action', p_action, 'org_id', p_org_id);

EXCEPTION WHEN OTHERS THEN
  -- Re-raise: audit log for denied cases already written above
  RAISE;
END;
$$;

-- Restrict: only authenticated sessions (with a valid JWT) can call this function.
-- The anon role cannot invoke it even with a valid anon key.
REVOKE ALL ON FUNCTION public.manage_membership(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.manage_membership(UUID, UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.manage_membership(UUID, UUID, TEXT, TEXT) TO authenticated;

-- ─── STEP 5: get_org_members() — safe member list (no recursive RLS) ──────────
CREATE OR REPLACE FUNCTION public.get_org_members(p_org_id UUID)
RETURNS TABLE (
  user_id         UUID,
  role            TEXT,
  is_active       BOOLEAN,
  full_name       TEXT,
  email           TEXT,
  avatar_initials TEXT,
  created_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   UUID;
  v_actor_role TEXT;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated.';
  END IF;

  -- Verify caller is an active member of this org
  SELECT m.role INTO v_actor_role
  FROM public.organisation_memberships m
  WHERE m.organisation_id = p_org_id
    AND m.user_id = v_actor_id
    AND m.is_active = TRUE;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Access denied. You are not a member of this organisation.';
  END IF;

  RETURN QUERY
    SELECT
      m.user_id, m.role, m.is_active,
      p.full_name, p.email, p.avatar_initials,
      m.created_at
    FROM public.organisation_memberships m
    JOIN public.user_profiles p ON p.id = m.user_id
    WHERE m.organisation_id = p_org_id
    ORDER BY m.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_members(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_org_members(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_org_members(UUID) TO authenticated;

-- ─── STEP 6: Also fix insert_audit_log() execution permissions ───────────────
-- Already exists from migration 001 helper block.
-- Ensure anon cannot call it directly.
REVOKE ALL ON FUNCTION public.insert_audit_log(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.insert_audit_log(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.insert_audit_log(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ─── STEP 7: Harden create_owner_membership — now only used by on_org_created ─
-- This function is called ONLY by the trigger, not by clients.
-- Revoke from both roles so clients cannot invoke it directly.
DROP FUNCTION IF EXISTS public.create_owner_membership(UUID, UUID);
-- (It was replaced by the trigger in migration 001. This removes any leftover.)
