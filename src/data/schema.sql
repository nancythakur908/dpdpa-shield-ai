-- ============================================================
-- PrivSecure India — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. user_profiles ─────────────────────────────────────────
-- Mirrors auth.users — stores display info per authenticated user
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_initials TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_initials)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 2. organisations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organisations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  display_name      TEXT,
  industry          TEXT,
  business_model    TEXT,
  employees         INT DEFAULT 0,
  monthly_users     TEXT,
  registered_state  TEXT,
  website           TEXT,
  business_address  TEXT,
  timezone          TEXT DEFAULT 'Asia/Kolkata',
  locale            TEXT DEFAULT 'en-IN',
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- ─── 3. organisation_memberships ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.organisation_memberships (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN (
    'Organisation Owner','Privacy Admin','Privacy Lead',
    'Legal Reviewer','Security Lead','Department Owner','Auditor','Viewer'
  )),
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organisation_id, user_id)
);

ALTER TABLE public.organisation_memberships ENABLE ROW LEVEL SECURITY;

-- Users can see their own memberships
CREATE POLICY "Members can read own memberships"
  ON public.organisation_memberships FOR SELECT
  USING (user_id = auth.uid());

-- Users can see co-members of their org
CREATE POLICY "Members can read org memberships"
  ON public.organisation_memberships FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Only owners/admins can insert memberships (handled in app layer + service role)
CREATE POLICY "Owners and admins can insert memberships"
  ON public.organisation_memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organisation_memberships
      WHERE organisation_id = organisation_memberships.organisation_id
        AND user_id = auth.uid()
        AND role IN ('Organisation Owner','Privacy Admin')
        AND is_active = TRUE
    )
  );

-- Org members can read their org
CREATE POLICY "Members can read own organisations"
  ON public.organisations FOR SELECT
  USING (
    id IN (
      SELECT organisation_id FROM public.organisation_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Only owners/admins can update org
CREATE POLICY "Owners and admins can update organisations"
  ON public.organisations FOR UPDATE
  USING (
    id IN (
      SELECT organisation_id FROM public.organisation_memberships
      WHERE user_id = auth.uid()
        AND role IN ('Organisation Owner','Privacy Admin')
        AND is_active = TRUE
    )
  );

-- Auto-create Owner membership on organization creation if creator is present
CREATE OR REPLACE FUNCTION public.handle_new_organisation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.organisation_memberships (organisation_id, user_id, role, is_active)
    VALUES (NEW.id, NEW.created_by, 'Organisation Owner', TRUE)
    ON CONFLICT (organisation_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_org_created ON public.organisations;
CREATE TRIGGER on_org_created
  AFTER INSERT ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_organisation();

-- ─── 4. organisation_settings ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organisation_settings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE UNIQUE,
  data_profile     JSONB DEFAULT '{}'::jsonb,
  governance       JSONB DEFAULT '{}'::jsonb,
  risk_profile     JSONB DEFAULT '{}'::jsonb,
  notification_preferences JSONB DEFAULT '{"email":true,"inApp":true}'::jsonb,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.organisation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read own org settings"
  ON public.organisation_settings FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Owners and admins can update org settings"
  ON public.organisation_settings FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_memberships
      WHERE user_id = auth.uid()
        AND role IN ('Organisation Owner','Privacy Admin')
        AND is_active = TRUE
    )
  );

CREATE POLICY "Owners and admins can insert org settings"
  ON public.organisation_settings FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_memberships
      WHERE user_id = auth.uid()
        AND role IN ('Organisation Owner','Privacy Admin')
        AND is_active = TRUE
    )
  );

-- ─── 5. invitations ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  role             TEXT NOT NULL,
  invited_by       UUID NOT NULL REFERENCES auth.users(id),
  token            TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted         BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organisation_id, email)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations"
  ON public.invitations FOR ALL
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_memberships
      WHERE user_id = auth.uid()
        AND role IN ('Organisation Owner','Privacy Admin')
        AND is_active = TRUE
    )
  );

-- ─── 6. audit_logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  actor_user_id    UUID REFERENCES auth.users(id),
  actor_email      TEXT,
  action           TEXT NOT NULL,
  entity_type      TEXT,
  entity_id        TEXT,
  result           TEXT NOT NULL CHECK (result IN ('Success','Failure','Denied')),
  metadata         JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Auditors, Admins, and Owners can read logs for their own org
CREATE POLICY "Authorised members can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_memberships
      WHERE user_id = auth.uid()
        AND role IN ('Organisation Owner','Privacy Admin','Privacy Lead','Auditor')
        AND is_active = TRUE
    )
  );

-- Logs are insert-only from the server; block client-side insert except via service role
CREATE POLICY "No direct client inserts to audit_logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (FALSE);

-- ─── 7. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.organisation_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org  ON public.organisation_memberships(organisation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org   ON public.audit_logs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
