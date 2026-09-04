-- Phase 3: Vendor/Processor Risk and Data Principal Rights Requests.
-- Run after migration 007.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_manage_vendor_risk(p_organisation_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organisation_memberships m
    WHERE m.organisation_id = p_organisation_id AND m.user_id = auth.uid() AND m.is_active
      AND m.role IN ('Organisation Owner', 'Privacy Admin', 'Privacy Lead', 'Security Lead')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_rights_requests(p_organisation_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organisation_memberships m
    WHERE m.organisation_id = p_organisation_id AND m.user_id = auth.uid() AND m.is_active
      AND m.role IN ('Organisation Owner', 'Privacy Admin', 'Privacy Lead', 'Legal Reviewer', 'Auditor')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_rights_requests(p_organisation_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organisation_memberships m
    WHERE m.organisation_id = p_organisation_id AND m.user_id = auth.uid() AND m.is_active
      AND m.role IN ('Organisation Owner', 'Privacy Admin', 'Privacy Lead', 'Legal Reviewer')
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_vendor_risk(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_vendor_risk(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.can_view_rights_requests(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_rights_requests(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.can_manage_rights_requests(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_rights_requests(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_organisation_id_change()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.organisation_id IS DISTINCT FROM OLD.organisation_id THEN
    RAISE EXCEPTION 'organisation_id is immutable.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_organisation_id_change() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 160),
  service_description TEXT NOT NULL CHECK (length(btrim(service_description)) BETWEEN 3 AND 1000),
  processor_role TEXT NOT NULL CHECK (processor_role IN ('Processor', 'Sub-processor', 'Independent Fiduciary', 'Other')),
  contact_email TEXT CHECK (contact_email IS NULL OR contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  processing_countries TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  data_categories TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  lifecycle_status TEXT NOT NULL DEFAULT 'Intake' CHECK (lifecycle_status IN (
    'Intake', 'Assessing', 'Pending Approval', 'Approved',
    'Reassessment Due', 'Offboarding', 'Offboarded', 'Rejected'
  )),
  security_score SMALLINT NOT NULL DEFAULT 1 CHECK (security_score BETWEEN 1 AND 5),
  privacy_score SMALLINT NOT NULL DEFAULT 1 CHECK (privacy_score BETWEEN 1 AND 5),
  data_sensitivity_score SMALLINT NOT NULL DEFAULT 1 CHECK (data_sensitivity_score BETWEEN 1 AND 5),
  business_criticality_score SMALLINT NOT NULL DEFAULT 1 CHECK (business_criticality_score BETWEEN 1 AND 5),
  risk_score SMALLINT GENERATED ALWAYS AS (
    (security_score + privacy_score + data_sensitivity_score + business_criticality_score) * 5
  ) STORED,
  assessment_summary TEXT CHECK (length(assessment_summary) <= 3000),
  approval_decision TEXT CHECK (approval_decision IN ('Pending', 'Approved', 'Rejected', 'Conditional')) DEFAULT 'Pending',
  approval_notes TEXT CHECK (length(approval_notes) <= 2000),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  next_reassessment_date DATE,
  offboarding_notes TEXT CHECK (length(offboarding_notes) <= 2000),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, id)
);

CREATE INDEX IF NOT EXISTS idx_vendors_org_lifecycle ON public.vendors(organisation_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_vendors_org_risk ON public.vendors(organisation_id, risk_score DESC);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read vendors" ON public.vendors;
DROP POLICY IF EXISTS "Managers can create vendors" ON public.vendors;
DROP POLICY IF EXISTS "Managers can update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Managers can delete vendors" ON public.vendors;
CREATE POLICY "Members can read vendors" ON public.vendors FOR SELECT TO authenticated
  USING (public.is_active_org_member(organisation_id));
CREATE POLICY "Managers can create vendors" ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_vendor_risk(organisation_id) AND created_by = auth.uid() AND updated_by = auth.uid());
CREATE POLICY "Managers can update vendors" ON public.vendors FOR UPDATE TO authenticated
  USING (public.can_manage_vendor_risk(organisation_id))
  WITH CHECK (public.can_manage_vendor_risk(organisation_id) AND updated_by = auth.uid());
CREATE POLICY "Managers can delete vendors" ON public.vendors FOR DELETE TO authenticated
  USING (public.can_manage_vendor_risk(organisation_id));

CREATE TABLE IF NOT EXISTS public.vendor_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('DPA', 'Security Assessment', 'Certification', 'Contract', 'Audit Report', 'Other')),
  document_name TEXT NOT NULL CHECK (length(btrim(document_name)) BETWEEN 2 AND 200),
  evidence_url TEXT CHECK (evidence_url IS NULL OR evidence_url ~* '^https://'),
  review_status TEXT NOT NULL DEFAULT 'Pending' CHECK (review_status IN ('Pending', 'Accepted', 'Rejected', 'Expired')),
  expires_on DATE,
  notes TEXT CHECK (length(notes) <= 1000),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, vendor_id, document_name),
  CONSTRAINT vendor_evidence_same_org_fk FOREIGN KEY (organisation_id, vendor_id)
    REFERENCES public.vendors(organisation_id, id) ON DELETE CASCADE
);

ALTER TABLE public.vendor_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read vendor evidence" ON public.vendor_evidence;
DROP POLICY IF EXISTS "Managers can create vendor evidence" ON public.vendor_evidence;
DROP POLICY IF EXISTS "Managers can update vendor evidence" ON public.vendor_evidence;
DROP POLICY IF EXISTS "Managers can delete vendor evidence" ON public.vendor_evidence;
CREATE POLICY "Members can read vendor evidence" ON public.vendor_evidence FOR SELECT TO authenticated
  USING (public.is_active_org_member(organisation_id));
CREATE POLICY "Managers can create vendor evidence" ON public.vendor_evidence FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_vendor_risk(organisation_id) AND created_by = auth.uid());
CREATE POLICY "Managers can update vendor evidence" ON public.vendor_evidence FOR UPDATE TO authenticated
  USING (public.can_manage_vendor_risk(organisation_id)) WITH CHECK (public.can_manage_vendor_risk(organisation_id));
CREATE POLICY "Managers can delete vendor evidence" ON public.vendor_evidence FOR DELETE TO authenticated
  USING (public.can_manage_vendor_risk(organisation_id));

DROP TRIGGER IF EXISTS prevent_vendor_org_change ON public.vendors;
CREATE TRIGGER prevent_vendor_org_change BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.prevent_organisation_id_change();
DROP TRIGGER IF EXISTS prevent_vendor_evidence_org_change ON public.vendor_evidence;
CREATE TRIGGER prevent_vendor_evidence_org_change BEFORE UPDATE ON public.vendor_evidence
  FOR EACH ROW EXECUTE FUNCTION public.prevent_organisation_id_change();

CREATE TABLE IF NOT EXISTS public.data_principal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL UNIQUE DEFAULT ('DPR-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 12))),
  principal_name TEXT NOT NULL CHECK (length(btrim(principal_name)) BETWEEN 2 AND 160),
  principal_email TEXT NOT NULL CHECK (principal_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  request_type TEXT NOT NULL CHECK (request_type IN ('Access', 'Correction', 'Erasure', 'Grievance', 'Consent Withdrawal', 'Nomination', 'Other')),
  request_details TEXT NOT NULL CHECK (length(btrim(request_details)) BETWEEN 10 AND 4000),
  verification_status TEXT NOT NULL DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Failed', 'Not Required')),
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE NOT NULL DEFAULT (current_date + 30),
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Verification', 'In Review', 'Waiting on Principal', 'Completed', 'Rejected', 'Closed')),
  response_text TEXT CHECK (length(response_text) <= 10000),
  responded_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, id)
);

CREATE INDEX IF NOT EXISTS idx_rights_requests_org_status ON public.data_principal_requests(organisation_id, status, due_date);
ALTER TABLE public.data_principal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authorised members can read rights requests" ON public.data_principal_requests;
DROP POLICY IF EXISTS "Managers can update rights requests" ON public.data_principal_requests;
DROP POLICY IF EXISTS "Managers can delete rights requests" ON public.data_principal_requests;
CREATE POLICY "Authorised members can read rights requests" ON public.data_principal_requests FOR SELECT TO authenticated
  USING (public.can_view_rights_requests(organisation_id));
CREATE POLICY "Managers can update rights requests" ON public.data_principal_requests FOR UPDATE TO authenticated
  USING (public.can_manage_rights_requests(organisation_id))
  WITH CHECK (public.can_manage_rights_requests(organisation_id) AND updated_by = auth.uid());
CREATE POLICY "Managers can delete rights requests" ON public.data_principal_requests FOR DELETE TO authenticated
  USING (public.can_manage_rights_requests(organisation_id));

DROP TRIGGER IF EXISTS prevent_rights_request_org_change ON public.data_principal_requests;
CREATE TRIGGER prevent_rights_request_org_change BEFORE UPDATE ON public.data_principal_requests
  FOR EACH ROW EXECUTE FUNCTION public.prevent_organisation_id_change();

CREATE TABLE IF NOT EXISTS public.rights_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('Submitted', 'Verified', 'Assigned', 'Status Changed', 'Response Added', 'Note', 'Deleted')),
  event_note TEXT CHECK (length(event_note) <= 2000),
  actor_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rights_event_same_org_fk FOREIGN KEY (organisation_id, request_id)
    REFERENCES public.data_principal_requests(organisation_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rights_events_request ON public.rights_request_events(organisation_id, request_id, created_at);
ALTER TABLE public.rights_request_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authorised members can read rights events" ON public.rights_request_events;
DROP POLICY IF EXISTS "Managers can create rights events" ON public.rights_request_events;
CREATE POLICY "Authorised members can read rights events" ON public.rights_request_events FOR SELECT TO authenticated
  USING (public.can_view_rights_requests(organisation_id));
CREATE POLICY "Managers can create rights events" ON public.rights_request_events FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_rights_requests(organisation_id) AND actor_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.submit_data_principal_request(
  p_organisation_id UUID, p_principal_name TEXT, p_principal_email TEXT,
  p_request_type TEXT, p_request_details TEXT
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE v_request public.data_principal_requests;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organisations WHERE id = p_organisation_id) THEN
    RAISE EXCEPTION 'Organisation not found.' USING ERRCODE = '22023';
  END IF;
  IF length(btrim(coalesce(p_principal_name, ''))) NOT BETWEEN 2 AND 160
     OR coalesce(p_principal_email, '') !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     OR p_request_type NOT IN ('Access', 'Correction', 'Erasure', 'Grievance', 'Consent Withdrawal', 'Nomination', 'Other')
     OR length(btrim(coalesce(p_request_details, ''))) NOT BETWEEN 10 AND 4000 THEN
    RAISE EXCEPTION 'Invalid request submission.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.data_principal_requests (
    organisation_id, principal_name, principal_email, request_type, request_details, created_by, updated_by
  ) VALUES (
    p_organisation_id, btrim(p_principal_name), lower(btrim(p_principal_email)),
    p_request_type, btrim(p_request_details), auth.uid(), auth.uid()
  ) RETURNING * INTO v_request;
  INSERT INTO public.rights_request_events (organisation_id, request_id, event_type, event_note, actor_user_id)
  VALUES (p_organisation_id, v_request.id, 'Submitted', 'Request received through public form.', auth.uid());
  RETURN v_request.reference_number;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_data_principal_request(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_data_principal_request(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

DROP TRIGGER IF EXISTS audit_vendor_changes ON public.vendors;
CREATE TRIGGER audit_vendor_changes AFTER INSERT OR UPDATE OR DELETE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.audit_privacy_operation();
DROP TRIGGER IF EXISTS audit_vendor_evidence_changes ON public.vendor_evidence;
CREATE TRIGGER audit_vendor_evidence_changes AFTER INSERT OR UPDATE OR DELETE ON public.vendor_evidence
  FOR EACH ROW EXECUTE FUNCTION public.audit_privacy_operation();
DROP TRIGGER IF EXISTS audit_rights_request_changes ON public.data_principal_requests;
CREATE TRIGGER audit_rights_request_changes AFTER INSERT OR UPDATE OR DELETE ON public.data_principal_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_privacy_operation();
DROP TRIGGER IF EXISTS audit_rights_event_changes ON public.rights_request_events;
CREATE TRIGGER audit_rights_event_changes AFTER INSERT ON public.rights_request_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_privacy_operation();

COMMIT;

-- Read-only verification.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, count(p.policyname) AS policy_count
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'public' AND c.relname IN ('vendors', 'vendor_evidence', 'data_principal_requests', 'rights_request_events')
GROUP BY c.relname, c.relrowsecurity ORDER BY c.relname;

SELECT p.oid::regprocedure AS function_signature, p.prosecdef AS security_definer, p.proconfig
FROM pg_catalog.pg_proc p
WHERE p.oid = to_regprocedure('public.submit_data_principal_request(uuid,text,text,text,text)');
