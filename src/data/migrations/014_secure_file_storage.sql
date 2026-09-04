-- Private, tenant-scoped file metadata. Upload/download URLs are issued only
-- by server-side Edge Functions; clients receive no Storage write policy.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('privsecure-quarantine', 'privsecure-quarantine', false, 10485760, ARRAY['application/pdf','image/png','image/jpeg','text/plain']),
  ('privsecure-documents', 'privsecure-documents', false, 10485760, ARRAY['application/pdf','image/png','image/jpeg','text/plain'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  original_name TEXT NOT NULL CHECK(length(btrim(original_name)) BETWEEN 1 AND 255),
  content_type TEXT NOT NULL CHECK(content_type IN ('application/pdf','image/png','image/jpeg','text/plain')),
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 10485760),
  storage_path TEXT NOT NULL UNIQUE,
  related_module TEXT CHECK(length(related_module) <= 80),
  related_record_id TEXT CHECK(length(related_record_id) <= 200),
  status TEXT NOT NULL DEFAULT 'PendingUpload' CHECK(status IN ('PendingUpload','Quarantined','Scanning','Clean','Rejected','Deleted')),
  sha256 TEXT,
  scan_provider TEXT,
  scan_result JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), scanned_at TIMESTAMPTZ,
  UNIQUE(organisation_id, id)
);

ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read uploaded file metadata" ON public.uploaded_files FOR SELECT TO authenticated
  USING (public.is_active_org_member(organisation_id));

-- Files are never readable across tenant paths. There are deliberately no
-- client INSERT/UPDATE/DELETE policies on storage.objects.
DROP POLICY IF EXISTS "Tenant document download" ON storage.objects;
CREATE POLICY "Tenant document download" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'privsecure-documents' AND EXISTS (
    SELECT 1 FROM public.uploaded_files f
    WHERE f.storage_path = name AND f.organisation_id::text = (storage.foldername(name))[1]
      AND f.status = 'Clean' AND public.is_active_org_member(f.organisation_id)
  ));

CREATE INDEX IF NOT EXISTS idx_uploaded_files_org_status ON public.uploaded_files(organisation_id, status, created_at DESC);
DROP TRIGGER IF EXISTS audit_uploaded_files_changes ON public.uploaded_files;
CREATE TRIGGER audit_uploaded_files_changes AFTER INSERT OR UPDATE OR DELETE ON public.uploaded_files
  FOR EACH ROW EXECUTE FUNCTION public.audit_privacy_operation();
COMMIT;
