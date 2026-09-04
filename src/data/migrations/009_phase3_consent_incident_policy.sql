-- Phase 3: Consent Management, Incident Response, and Policy Management.
-- Run after migration 008.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_manage_consent(p_org UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.organisation_memberships m
 WHERE m.organisation_id=p_org AND m.user_id=auth.uid() AND m.is_active
 AND m.role IN ('Organisation Owner','Privacy Admin','Privacy Lead'));
$$;
CREATE OR REPLACE FUNCTION public.can_manage_incidents(p_org UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.organisation_memberships m
 WHERE m.organisation_id=p_org AND m.user_id=auth.uid() AND m.is_active
 AND m.role IN ('Organisation Owner','Privacy Admin','Privacy Lead','Security Lead'));
$$;
CREATE OR REPLACE FUNCTION public.can_manage_policies(p_org UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.organisation_memberships m
 WHERE m.organisation_id=p_org AND m.user_id=auth.uid() AND m.is_active
 AND m.role IN ('Organisation Owner','Privacy Admin','Privacy Lead','Legal Reviewer'));
$$;
REVOKE ALL ON FUNCTION public.can_manage_consent(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_incidents(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_policies(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_consent(UUID), public.can_manage_incidents(UUID), public.can_manage_policies(UUID) TO authenticated;

CREATE TABLE IF NOT EXISTS public.consent_purposes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
 name TEXT NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 160), description TEXT NOT NULL CHECK(length(btrim(description)) BETWEEN 3 AND 1500),
 lawful_basis TEXT NOT NULL DEFAULT 'Consent' CHECK(lawful_basis IN ('Consent','Legitimate Use','Legal Obligation','Other')),
 is_active BOOLEAN NOT NULL DEFAULT true, created_by UUID NOT NULL REFERENCES auth.users(id), updated_by UUID NOT NULL REFERENCES auth.users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(organisation_id,id)
);
CREATE TABLE IF NOT EXISTS public.consent_notice_versions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
 purpose_id UUID NOT NULL, version_label TEXT NOT NULL CHECK(length(btrim(version_label)) BETWEEN 1 AND 40), content TEXT NOT NULL CHECK(length(btrim(content)) BETWEEN 10 AND 20000),
 status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Published','Retired')), published_at TIMESTAMPTZ,
 created_by UUID NOT NULL REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organisation_id,purpose_id,version_label), UNIQUE(organisation_id,purpose_id,id),
 CONSTRAINT consent_notice_same_org_fk FOREIGN KEY(organisation_id,purpose_id) REFERENCES public.consent_purposes(organisation_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.consent_records (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
 principal_reference TEXT NOT NULL CHECK(length(btrim(principal_reference)) BETWEEN 2 AND 320), purpose_id UUID NOT NULL, notice_version_id UUID NOT NULL,
 status TEXT NOT NULL DEFAULT 'Granted' CHECK(status IN ('Granted','Withdrawn','Expired')), collection_channel TEXT NOT NULL CHECK(length(collection_channel) BETWEEN 2 AND 100),
 granted_at TIMESTAMPTZ NOT NULL DEFAULT now(), withdrawn_at TIMESTAMPTZ, withdrawal_reason TEXT CHECK(length(withdrawal_reason)<=1000),
 created_by UUID NOT NULL REFERENCES auth.users(id), updated_by UUID NOT NULL REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organisation_id,id), CONSTRAINT consent_record_notice_same_org_fk FOREIGN KEY(organisation_id,purpose_id,notice_version_id)
 REFERENCES public.consent_notice_versions(organisation_id,purpose_id,id)
);
CREATE TABLE IF NOT EXISTS public.consent_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
 consent_record_id UUID NOT NULL, event_type TEXT NOT NULL CHECK(event_type IN ('Granted','Withdrawn','Updated','Expired')),
 event_note TEXT CHECK(length(event_note)<=1000), actor_user_id UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT consent_event_same_org_fk FOREIGN KEY(organisation_id,consent_record_id) REFERENCES public.consent_records(organisation_id,id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.privacy_incidents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 180), summary TEXT NOT NULL CHECK(length(btrim(summary)) BETWEEN 10 AND 4000),
 severity TEXT NOT NULL CHECK(severity IN ('Low','Medium','High','Critical')), status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Investigating','Contained','Notification Required','Monitoring','Closed')),
 affected_data_categories TEXT[] NOT NULL DEFAULT '{}'::TEXT[], affected_principals INTEGER CHECK(affected_principals IS NULL OR affected_principals>=0),
 detected_at TIMESTAMPTZ NOT NULL, contained_at TIMESTAMPTZ, root_cause TEXT CHECK(length(root_cause)<=3000), closure_report TEXT CHECK(length(closure_report)<=10000), closed_at TIMESTAMPTZ,
 owner_name TEXT CHECK(length(owner_name)<=120), created_by UUID NOT NULL REFERENCES auth.users(id), updated_by UUID NOT NULL REFERENCES auth.users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(organisation_id,id)
);
CREATE TABLE IF NOT EXISTS public.incident_actions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE, incident_id UUID NOT NULL,
 action_text TEXT NOT NULL CHECK(length(btrim(action_text)) BETWEEN 3 AND 2000), status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','In Progress','Completed')),
 owner_name TEXT CHECK(length(owner_name)<=120), due_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, created_by UUID NOT NULL REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT incident_action_same_org_fk FOREIGN KEY(organisation_id,incident_id) REFERENCES public.privacy_incidents(organisation_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.incident_notifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE, incident_id UUID NOT NULL,
 recipient_type TEXT NOT NULL CHECK(recipient_type IN ('Data Principal','Data Protection Board','Processor','Internal','Other')),
 notification_status TEXT NOT NULL DEFAULT 'Draft' CHECK(notification_status IN ('Draft','Approved','Sent','Not Required')),
 notified_at TIMESTAMPTZ, message_summary TEXT NOT NULL CHECK(length(btrim(message_summary)) BETWEEN 3 AND 3000), created_by UUID NOT NULL REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT incident_notification_same_org_fk FOREIGN KEY(organisation_id,incident_id) REFERENCES public.privacy_incidents(organisation_id,id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.privacy_policies (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 180), policy_type TEXT NOT NULL CHECK(length(btrim(policy_type)) BETWEEN 2 AND 100),
 version_label TEXT NOT NULL CHECK(length(btrim(version_label)) BETWEEN 1 AND 40), content TEXT NOT NULL CHECK(length(btrim(content)) BETWEEN 10 AND 30000),
 lifecycle_status TEXT NOT NULL DEFAULT 'Draft' CHECK(lifecycle_status IN ('Draft','Review','Approved','Published','Review Due','Archived')),
 owner_name TEXT CHECK(length(owner_name)<=120), reviewer_user_id UUID REFERENCES auth.users(id), approver_user_id UUID REFERENCES auth.users(id),
 review_due_date DATE, approved_at TIMESTAMPTZ, published_at TIMESTAMPTZ, archived_at TIMESTAMPTZ,
 created_by UUID NOT NULL REFERENCES auth.users(id), updated_by UUID NOT NULL REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organisation_id,id), UNIQUE(organisation_id,title,version_label)
);

CREATE OR REPLACE FUNCTION public.validate_incident_closure()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
 IF NEW.status = 'Closed' AND length(btrim(coalesce(NEW.closure_report,''))) < 10 THEN
  RAISE EXCEPTION 'A closure report of at least 10 characters is required before closing an incident.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.enforce_policy_lifecycle()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
 IF NEW.lifecycle_status <> OLD.lifecycle_status AND NOT (
  (OLD.lifecycle_status='Draft' AND NEW.lifecycle_status='Review') OR
  (OLD.lifecycle_status='Review' AND NEW.lifecycle_status='Approved') OR
  (OLD.lifecycle_status='Approved' AND NEW.lifecycle_status='Published') OR
  (OLD.lifecycle_status='Published' AND NEW.lifecycle_status='Review Due') OR
  (OLD.lifecycle_status='Review Due' AND NEW.lifecycle_status='Archived')
 ) THEN RAISE EXCEPTION 'Invalid policy lifecycle transition: % to %.',OLD.lifecycle_status,NEW.lifecycle_status USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_incident_closure(), public.enforce_policy_lifecycle() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS validate_incident_closure_before_write ON public.privacy_incidents;
CREATE TRIGGER validate_incident_closure_before_write BEFORE INSERT OR UPDATE ON public.privacy_incidents
 FOR EACH ROW EXECUTE FUNCTION public.validate_incident_closure();
DROP TRIGGER IF EXISTS enforce_policy_lifecycle_before_update ON public.privacy_policies;
CREATE TRIGGER enforce_policy_lifecycle_before_update BEFORE UPDATE ON public.privacy_policies
 FOR EACH ROW EXECUTE FUNCTION public.enforce_policy_lifecycle();

-- RLS policy templates: members read, authorised roles mutate.
ALTER TABLE public.consent_purposes ENABLE ROW LEVEL SECURITY; ALTER TABLE public.consent_notice_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY; ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_incidents ENABLE ROW LEVEL SECURITY; ALTER TABLE public.incident_actions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.incident_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_policies ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT; manage_fn TEXT; BEGIN
 FOR t,manage_fn IN SELECT * FROM (VALUES
  ('consent_purposes','can_manage_consent'),('consent_notice_versions','can_manage_consent'),('consent_records','can_manage_consent'),('consent_events','can_manage_consent'),
  ('privacy_incidents','can_manage_incidents'),('incident_actions','can_manage_incidents'),('incident_notifications','can_manage_incidents'),('privacy_policies','can_manage_policies')
 ) AS v(t,f) LOOP
  EXECUTE format('DROP POLICY IF EXISTS "Members can read %s" ON public.%I',t,t);
  EXECUTE format('DROP POLICY IF EXISTS "Managers can create %s" ON public.%I',t,t);
  EXECUTE format('DROP POLICY IF EXISTS "Managers can update %s" ON public.%I',t,t);
  EXECUTE format('DROP POLICY IF EXISTS "Managers can delete %s" ON public.%I',t,t);
  EXECUTE format('CREATE POLICY "Members can read %s" ON public.%I FOR SELECT TO authenticated USING (public.is_active_org_member(organisation_id))',t,t);
  EXECUTE format('CREATE POLICY "Managers can create %s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.%I(organisation_id))',t,t,manage_fn);
  IF t NOT IN ('consent_events') THEN
   EXECUTE format('CREATE POLICY "Managers can update %s" ON public.%I FOR UPDATE TO authenticated USING (public.%I(organisation_id)) WITH CHECK (public.%I(organisation_id))',t,t,manage_fn,manage_fn);
  END IF;
  EXECUTE format('CREATE POLICY "Managers can delete %s" ON public.%I FOR DELETE TO authenticated USING (public.%I(organisation_id))',t,t,manage_fn);
 END LOOP;
END $$;

-- Organisation IDs cannot be moved after insert, and every mutation is audited.
DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['consent_purposes','consent_notice_versions','consent_records','privacy_incidents','incident_actions','incident_notifications','privacy_policies'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS prevent_%s_org_change ON public.%I',t,t);
  EXECUTE format('CREATE TRIGGER prevent_%s_org_change BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_organisation_id_change()',t,t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['consent_purposes','consent_notice_versions','consent_records','consent_events','privacy_incidents','incident_actions','incident_notifications','privacy_policies'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS audit_%s_changes ON public.%I',t,t);
  EXECUTE format('CREATE TRIGGER audit_%s_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_privacy_operation()',t,t);
 END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_consent_records_org_status ON public.consent_records(organisation_id,status,granted_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON public.privacy_incidents(organisation_id,status,severity);
CREATE INDEX IF NOT EXISTS idx_policies_org_status ON public.privacy_policies(organisation_id,lifecycle_status,review_due_date);

COMMIT;

-- Read-only verification.
SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled,count(p.policyname) AS policy_count
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_catalog.pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname
WHERE n.nspname='public' AND c.relname IN ('consent_purposes','consent_notice_versions','consent_records','consent_events','privacy_incidents','incident_actions','incident_notifications','privacy_policies')
GROUP BY c.relname,c.relrowsecurity ORDER BY c.relname;
