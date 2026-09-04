-- Phase 5: Enterprise discovery, mapping, cookie, notification and AI workflow records.
-- Run after migration 010. This migration is additive and does not alter existing modules.
BEGIN;

CREATE OR REPLACE FUNCTION public.can_manage_enterprise(p_org UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.organisation_memberships m WHERE m.organisation_id=p_org AND m.user_id=auth.uid() AND m.is_active AND m.role IN('Organisation Owner','Privacy Admin','Privacy Lead','Security Lead','Department Owner'));
$$;
REVOKE ALL ON FUNCTION public.can_manage_enterprise(UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_manage_enterprise(UUID) TO authenticated;

CREATE TABLE IF NOT EXISTS public.discovery_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL CHECK(length(btrim(source_name)) BETWEEN 2 AND 160), source_type TEXT NOT NULL CHECK(source_type IN('CSV','Excel','Database')),
  status TEXT NOT NULL DEFAULT 'Queued' CHECK(status IN('Queued','Running','Completed','Failed')),
  records_scanned INTEGER NOT NULL DEFAULT 0 CHECK(records_scanned >= 0), findings_count INTEGER NOT NULL DEFAULT 0 CHECK(findings_count >= 0),
  created_by UUID NOT NULL REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS public.discovery_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL, field_name TEXT NOT NULL CHECK(length(btrim(field_name)) BETWEEN 1 AND 160), classification TEXT NOT NULL,
  sensitivity TEXT NOT NULL CHECK(sensitivity IN('Personal','Sensitive Personal','Non-personal')), confidence NUMERIC(5,2) NOT NULL CHECK(confidence >= 0 AND confidence <= 100), sample_masked TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT discovery_finding_same_org_fk FOREIGN KEY(organisation_id,scan_id) REFERENCES public.discovery_scans(organisation_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.data_flow_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(btrim(name)) BETWEEN 3 AND 160), department TEXT NOT NULL DEFAULT 'General', description TEXT, status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN('Draft','Published','Archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id), updated_by UUID NOT NULL REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(organisation_id,id)
);
CREATE TABLE IF NOT EXISTS public.data_flow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE, map_id UUID NOT NULL,
  label TEXT NOT NULL CHECK(length(btrim(label)) BETWEEN 2 AND 120), node_type TEXT NOT NULL CHECK(node_type IN('Source','Processing','Storage','Third Party')), risk_level TEXT NOT NULL DEFAULT 'Low' CHECK(risk_level IN('Low','Medium','High','Critical')), position_x INTEGER NOT NULL DEFAULT 0, position_y INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT data_flow_node_same_org_fk FOREIGN KEY(organisation_id,map_id) REFERENCES public.data_flow_maps(organisation_id,id) ON DELETE CASCADE, UNIQUE(organisation_id,id)
);
CREATE TABLE IF NOT EXISTS public.data_flow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE, map_id UUID NOT NULL, source_node_id UUID NOT NULL, target_node_id UUID NOT NULL, data_categories TEXT[] NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT data_flow_edge_map_fk FOREIGN KEY(organisation_id,map_id) REFERENCES public.data_flow_maps(organisation_id,id) ON DELETE CASCADE,
  CONSTRAINT data_flow_edge_source_fk FOREIGN KEY(organisation_id,source_node_id) REFERENCES public.data_flow_nodes(organisation_id,id) ON DELETE CASCADE,
  CONSTRAINT data_flow_edge_target_fk FOREIGN KEY(organisation_id,target_node_id) REFERENCES public.data_flow_nodes(organisation_id,id) ON DELETE CASCADE, CHECK(source_node_id <> target_node_id)
);
CREATE TABLE IF NOT EXISTS public.cookie_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE, domain TEXT NOT NULL CHECK(domain ~* '^[a-z0-9.-]+\\.[a-z]{2,}$'), geo_mode TEXT NOT NULL DEFAULT 'Global' CHECK(geo_mode IN('Global','India','EEA')), banner_enabled BOOLEAN NOT NULL DEFAULT true, created_by UUID NOT NULL REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(organisation_id,domain), UNIQUE(organisation_id,id)
);
CREATE TABLE IF NOT EXISTS public.cookie_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE, domain_id UUID NOT NULL, cookie_name TEXT NOT NULL CHECK(length(btrim(cookie_name)) BETWEEN 1 AND 160), category TEXT NOT NULL CHECK(category IN('Necessary','Preferences','Analytics','Marketing')), provider TEXT, duration TEXT, blocked_until_consent BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cookie_registry_same_org_fk FOREIGN KEY(organisation_id,domain_id) REFERENCES public.cookie_domains(organisation_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE, recipient_user_id UUID REFERENCES auth.users(id), title TEXT NOT NULL CHECK(length(btrim(title)) BETWEEN 2 AND 160), body TEXT NOT NULL CHECK(length(btrim(body)) BETWEEN 2 AND 2000), type TEXT NOT NULL DEFAULT 'Info' CHECK(type IN('Info','Reminder','Deadline','Escalation','Risk')), related_module TEXT, related_record_id TEXT, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ai_conversations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE, title TEXT NOT NULL DEFAULT 'New conversation', created_by UUID NOT NULL REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(organisation_id,id));
CREATE TABLE IF NOT EXISTS public.ai_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE, conversation_id UUID NOT NULL, role TEXT NOT NULL CHECK(role IN('user','assistant')), content TEXT NOT NULL CHECK(length(btrim(content)) BETWEEN 1 AND 8000), context_snapshot JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT ai_message_same_org_fk FOREIGN KEY(organisation_id,conversation_id) REFERENCES public.ai_conversations(organisation_id,id) ON DELETE CASCADE);

DO $$ DECLARE t TEXT; BEGIN FOREACH t IN ARRAY ARRAY['discovery_scans','discovery_findings','data_flow_maps','data_flow_nodes','data_flow_edges','cookie_domains','cookie_registry','app_notifications','ai_conversations','ai_messages'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('DROP POLICY IF EXISTS "Members read %s" ON public.%I',t,t);
  EXECUTE format('DROP POLICY IF EXISTS "Managers write %s" ON public.%I',t,t);
  EXECUTE format('CREATE POLICY "Members read %s" ON public.%I FOR SELECT TO authenticated USING(public.is_active_org_member(organisation_id))',t,t);
  EXECUTE format('CREATE POLICY "Managers write %s" ON public.%I FOR ALL TO authenticated USING(public.can_manage_enterprise(organisation_id)) WITH CHECK(public.can_manage_enterprise(organisation_id))',t,t);
  EXECUTE format('DROP TRIGGER IF EXISTS audit_%s_changes ON public.%I',t,t);
  EXECUTE format('CREATE TRIGGER audit_%s_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_privacy_operation()',t,t);
END LOOP; END $$;
CREATE INDEX IF NOT EXISTS idx_discovery_org_created ON public.discovery_scans(organisation_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_maps_org ON public.data_flow_maps(organisation_id,department);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.app_notifications(organisation_id,recipient_user_id,read_at,created_at DESC);
COMMIT;
