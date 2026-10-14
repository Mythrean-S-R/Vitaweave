-- VitaWeave 006 - DPDP consent records + data rights requests
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  purposes JSONB DEFAULT '[]',
  medical_disclaimer BOOLEAN DEFAULT TRUE,
  privacy_policy BOOLEAN DEFAULT TRUE,
  data_processing BOOLEAN DEFAULT TRUE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.data_rights_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'erasure')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'processed', 'rejected')),
  payload JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_actor ON public.consent_records(actor_id);
CREATE INDEX IF NOT EXISTS idx_data_rights_actor ON public.data_rights_requests(actor_id);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_rights_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consent_own ON public.consent_records;
CREATE POLICY consent_own ON public.consent_records FOR ALL TO authenticated
  USING (actor_id = auth.uid()) WITH CHECK (actor_id = auth.uid());

DROP POLICY IF EXISTS data_rights_own ON public.data_rights_requests;
CREATE POLICY data_rights_own ON public.data_rights_requests FOR ALL TO authenticated
  USING (actor_id = auth.uid()) WITH CHECK (actor_id = auth.uid());
