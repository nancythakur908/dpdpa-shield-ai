-- Phase 3: Data Inventory and Privacy Risk Register.
-- Run after migration 006.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_manage_data_inventory(p_organisation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organisation_memberships AS membership
    WHERE membership.organisation_id = p_organisation_id
      AND membership.user_id = auth.uid()
      AND membership.is_active
      AND membership.role IN (
        'Organisation Owner', 'Privacy Admin', 'Privacy Lead',
        'Security Lead', 'Department Owner'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_privacy_risks(p_organisation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organisation_memberships AS membership
    WHERE membership.organisation_id = p_organisation_id
      AND membership.user_id = auth.uid()
      AND membership.is_active
      AND membership.role IN (
        'Organisation Owner', 'Privacy Admin', 'Privacy Lead', 'Security Lead'
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_data_inventory(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_data_inventory(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.can_manage_privacy_risks(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_privacy_risks(UUID) TO authenticated;

CREATE TABLE IF NOT EXISTS public.data_inventory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  record_name TEXT NOT NULL CHECK (length(btrim(record_name)) BETWEEN 3 AND 160),
  data_category TEXT NOT NULL CHECK (length(btrim(data_category)) BETWEEN 2 AND 100),
  data_subjects TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  processing_purpose TEXT NOT NULL CHECK (length(btrim(processing_purpose)) BETWEEN 3 AND 1000),
  lawful_basis TEXT NOT NULL CHECK (lawful_basis IN (
    'Consent', 'Legitimate Use', 'Legal Obligation', 'Employment', 'Emergency', 'Other'
  )),
  systems TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  storage_locations TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  retention_period TEXT CHECK (length(retention_period) <= 240),
  sensitivity TEXT NOT NULL DEFAULT 'Medium' CHECK (sensitivity IN ('Low', 'Medium', 'High', 'Restricted')),
  owner_name TEXT CHECK (length(owner_name) <= 120),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, id)
);

CREATE INDEX IF NOT EXISTS idx_data_inventory_org_updated
  ON public.data_inventory_records(organisation_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_inventory_org_category
  ON public.data_inventory_records(organisation_id, data_category);

ALTER TABLE public.data_inventory_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read data inventory" ON public.data_inventory_records;
DROP POLICY IF EXISTS "Managers can create data inventory" ON public.data_inventory_records;
DROP POLICY IF EXISTS "Managers can update data inventory" ON public.data_inventory_records;
DROP POLICY IF EXISTS "Managers can delete data inventory" ON public.data_inventory_records;

CREATE POLICY "Members can read data inventory"
  ON public.data_inventory_records FOR SELECT TO authenticated
  USING (public.is_active_org_member(organisation_id));
CREATE POLICY "Managers can create data inventory"
  ON public.data_inventory_records FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_data_inventory(organisation_id)
    AND created_by = auth.uid() AND updated_by = auth.uid());
CREATE POLICY "Managers can update data inventory"
  ON public.data_inventory_records FOR UPDATE TO authenticated
  USING (public.can_manage_data_inventory(organisation_id))
  WITH CHECK (public.can_manage_data_inventory(organisation_id) AND updated_by = auth.uid());
CREATE POLICY "Managers can delete data inventory"
  ON public.data_inventory_records FOR DELETE TO authenticated
  USING (public.can_manage_data_inventory(organisation_id));

CREATE TABLE IF NOT EXISTS public.privacy_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 160),
  description TEXT NOT NULL CHECK (length(btrim(description)) BETWEEN 3 AND 2000),
  category TEXT NOT NULL CHECK (category IN (
    'Governance', 'Transparency', 'Consent', 'Rights', 'Security',
    'Vendor', 'Retention', 'Children', 'Incident', 'Other'
  )),
  likelihood SMALLINT NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  impact SMALLINT NOT NULL CHECK (impact BETWEEN 1 AND 5),
  inherent_score SMALLINT GENERATED ALWAYS AS (likelihood * impact) STORED,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Treating', 'Accepted', 'Closed')),
  treatment TEXT CHECK (length(treatment) <= 3000),
  owner_name TEXT CHECK (length(owner_name) <= 120),
  review_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, id)
);

CREATE INDEX IF NOT EXISTS idx_privacy_risks_org_score
  ON public.privacy_risks(organisation_id, inherent_score DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_risks_org_status
  ON public.privacy_risks(organisation_id, status, review_date);

ALTER TABLE public.privacy_risks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read privacy risks" ON public.privacy_risks;
DROP POLICY IF EXISTS "Managers can create privacy risks" ON public.privacy_risks;
DROP POLICY IF EXISTS "Managers can update privacy risks" ON public.privacy_risks;
DROP POLICY IF EXISTS "Managers can delete privacy risks" ON public.privacy_risks;

CREATE POLICY "Members can read privacy risks"
  ON public.privacy_risks FOR SELECT TO authenticated
  USING (public.is_active_org_member(organisation_id));
CREATE POLICY "Managers can create privacy risks"
  ON public.privacy_risks FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_privacy_risks(organisation_id)
    AND created_by = auth.uid() AND updated_by = auth.uid());
CREATE POLICY "Managers can update privacy risks"
  ON public.privacy_risks FOR UPDATE TO authenticated
  USING (public.can_manage_privacy_risks(organisation_id))
  WITH CHECK (public.can_manage_privacy_risks(organisation_id) AND updated_by = auth.uid());
CREATE POLICY "Managers can delete privacy risks"
  ON public.privacy_risks FOR DELETE TO authenticated
  USING (public.can_manage_privacy_risks(organisation_id));

CREATE TABLE IF NOT EXISTS public.privacy_risk_inventory_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  risk_id UUID NOT NULL,
  inventory_record_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, risk_id, inventory_record_id),
  CONSTRAINT risk_link_same_org_risk_fk
    FOREIGN KEY (organisation_id, risk_id)
    REFERENCES public.privacy_risks(organisation_id, id) ON DELETE CASCADE,
  CONSTRAINT risk_link_same_org_inventory_fk
    FOREIGN KEY (organisation_id, inventory_record_id)
    REFERENCES public.data_inventory_records(organisation_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_risk_inventory_links_org_risk
  ON public.privacy_risk_inventory_links(organisation_id, risk_id);

ALTER TABLE public.privacy_risk_inventory_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read risk inventory links" ON public.privacy_risk_inventory_links;
DROP POLICY IF EXISTS "Managers can create risk inventory links" ON public.privacy_risk_inventory_links;
DROP POLICY IF EXISTS "Managers can delete risk inventory links" ON public.privacy_risk_inventory_links;

CREATE POLICY "Members can read risk inventory links"
  ON public.privacy_risk_inventory_links FOR SELECT TO authenticated
  USING (public.is_active_org_member(organisation_id));
CREATE POLICY "Managers can create risk inventory links"
  ON public.privacy_risk_inventory_links FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_privacy_risks(organisation_id) AND created_by = auth.uid());
CREATE POLICY "Managers can delete risk inventory links"
  ON public.privacy_risk_inventory_links FOR DELETE TO authenticated
  USING (public.can_manage_privacy_risks(organisation_id));

DROP TRIGGER IF EXISTS audit_data_inventory_changes ON public.data_inventory_records;
CREATE TRIGGER audit_data_inventory_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.data_inventory_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_privacy_operation();

DROP TRIGGER IF EXISTS audit_privacy_risk_changes ON public.privacy_risks;
CREATE TRIGGER audit_privacy_risk_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.privacy_risks
  FOR EACH ROW EXECUTE FUNCTION public.audit_privacy_operation();

DROP TRIGGER IF EXISTS audit_risk_inventory_link_changes ON public.privacy_risk_inventory_links;
CREATE TRIGGER audit_risk_inventory_link_changes
  AFTER INSERT OR DELETE ON public.privacy_risk_inventory_links
  FOR EACH ROW EXECUTE FUNCTION public.audit_privacy_operation();

COMMIT;

-- Read-only verification.
SELECT table_row.relname AS table_name, table_row.relrowsecurity AS rls_enabled,
       count(policy.policyname) AS policy_count
FROM pg_catalog.pg_class AS table_row
JOIN pg_catalog.pg_namespace AS table_schema ON table_schema.oid = table_row.relnamespace
LEFT JOIN pg_catalog.pg_policies AS policy
  ON policy.schemaname = table_schema.nspname AND policy.tablename = table_row.relname
WHERE table_schema.nspname = 'public'
  AND table_row.relname IN (
    'data_inventory_records', 'privacy_risks', 'privacy_risk_inventory_links'
  )
GROUP BY table_row.relname, table_row.relrowsecurity
ORDER BY table_row.relname;

SELECT constraint_row.conname AS constraint_name,
       constraint_row.conrelid::regclass AS source_table,
       constraint_row.confrelid::regclass AS target_table
FROM pg_catalog.pg_constraint AS constraint_row
WHERE constraint_row.conname IN (
  'risk_link_same_org_risk_fk', 'risk_link_same_org_inventory_fk'
)
ORDER BY constraint_row.conname;
