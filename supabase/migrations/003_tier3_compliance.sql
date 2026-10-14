-- VitaWeave 003 - Admin metrics, server push support, audit & compliance (Tier 3)
-- Apply after 002_core_features.sql

-- ABHA M1 placeholders (full M2/M3 integration deferred)
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS abha_id TEXT,
  ADD COLUMN IF NOT EXISTS abha_verified BOOLEAN DEFAULT FALSE;

-- Priority score audit trail (transparent rule engine, not ML)
CREATE TABLE IF NOT EXISTS public.scoring_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  risk_level TEXT,
  factors JSONB DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'trigger', 'manual', 'triage')),
  computed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scoring_audit_patient ON public.scoring_audit(patient_id, created_at DESC);

ALTER TABLE public.scoring_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scoring_audit_insert ON public.scoring_audit;
CREATE POLICY scoring_audit_insert ON public.scoring_audit FOR INSERT TO authenticated
  WITH CHECK (
    computed_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('asha', 'doctor', 'admin'))
  );

DROP POLICY IF EXISTS scoring_audit_select ON public.scoring_audit;
CREATE POLICY scoring_audit_select ON public.scoring_audit FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('doctor', 'admin'))
  OR EXISTS (
    SELECT 1 FROM public.patients pt
    WHERE pt.id = patient_id AND (pt.assigned_asha_id = auth.uid() OR pt.assigned_doctor_id = auth.uid())
  )
);

-- Immutable-style access audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL CHECK (action IN ('read', 'create', 'update', 'delete', 'login', 'export')),
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON public.audit_log(resource_type, resource_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_insert ON public.audit_log;
CREATE POLICY audit_log_insert ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

DROP POLICY IF EXISTS audit_log_admin_select ON public.audit_log;
CREATE POLICY audit_log_admin_select ON public.audit_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ASHA gig / field compliance (daily visit logs)
CREATE TABLE IF NOT EXISTS public.asha_compliance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asha_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visits_completed INT DEFAULT 0,
  hours_logged NUMERIC DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (asha_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_asha_compliance_date ON public.asha_compliance_logs(log_date DESC);

ALTER TABLE public.asha_compliance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS asha_compliance_owner ON public.asha_compliance_logs;
CREATE POLICY asha_compliance_owner ON public.asha_compliance_logs FOR ALL TO authenticated USING (
  asha_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  asha_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Allow admin to upsert district metrics for pilot seeding
DROP POLICY IF EXISTS district_metrics_admin_write ON public.district_metrics;
CREATE POLICY district_metrics_admin_write ON public.district_metrics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS district_metrics_admin_update ON public.district_metrics;
CREATE POLICY district_metrics_admin_update ON public.district_metrics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
