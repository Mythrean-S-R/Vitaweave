-- VitaWeave 002 - Core features (referrals, urgency score, reminders, admin metrics, push tokens)
-- Apply after complete_schema.sql. Do not edit complete_schema.sql in place.

-- 1. Referrals (closed-loop tracking)
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  referred_by UUID NOT NULL REFERENCES public.profiles(id),
  referred_to_type TEXT NOT NULL CHECK (referred_to_type IN ('phc', 'hospital', 'telemedicine', 'specialist')),
  referred_to_name TEXT,
  reason TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'emergency')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'completed', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  outcome_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_referrals_patient ON public.referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_by ON public.referrals(referred_by);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referrals_select ON public.referrals;
CREATE POLICY referrals_select ON public.referrals FOR SELECT TO authenticated USING (
  referred_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('doctor', 'admin'))
);

DROP POLICY IF EXISTS referrals_insert ON public.referrals;
CREATE POLICY referrals_insert ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (referred_by = auth.uid());

DROP POLICY IF EXISTS referrals_update ON public.referrals;
CREATE POLICY referrals_update ON public.referrals FOR UPDATE TO authenticated USING (
  referred_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('doctor', 'admin'))
);

-- 2. Urgency score columns on patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS urgency_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urgency_score_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_patients_urgency_score ON public.patients(urgency_score DESC);

-- Link vitals to patient row (for ASHA-registered patients without app profile)
ALTER TABLE public.patient_vitals
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_patient_vitals_patient ON public.patient_vitals(patient_id);

-- 3. Medication reminders
CREATE TABLE IF NOT EXISTS public.medication_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  schedule_times TEXT[] NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_med_reminders_patient ON public.medication_reminders(patient_id);

ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS med_reminders_owner ON public.medication_reminders;
CREATE POLICY med_reminders_owner ON public.medication_reminders FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_id AND p.profile_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role IN ('asha', 'doctor', 'admin')
  )
);

-- 4. District metrics (admin / supervisor)
CREATE TABLE IF NOT EXISTS public.district_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district TEXT NOT NULL,
  metric_date DATE NOT NULL,
  active_asha_count INT DEFAULT 0,
  patients_registered INT DEFAULT 0,
  high_risk_open INT DEFAULT 0,
  referrals_pending INT DEFAULT 0,
  avg_referral_completion_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (district, metric_date)
);

ALTER TABLE public.district_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS district_metrics_admin ON public.district_metrics;
CREATE POLICY district_metrics_admin ON public.district_metrics FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- 5. Push tokens
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, expo_push_token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_tokens_owner ON public.push_tokens;
CREATE POLICY push_tokens_owner ON public.push_tokens FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- 6. Server-side sync queue (optional audit; client uses AsyncStorage queue)
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  payload JSONB NOT NULL DEFAULT '{}',
  record_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_unsynced ON public.sync_queue(synced) WHERE synced = FALSE;

ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_queue_owner ON public.sync_queue;
CREATE POLICY sync_queue_owner ON public.sync_queue FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- 7. DB trigger: recalculate urgency_score on patient_vitals insert (simplified NEWS2-adapted backup)
-- Mirrors weights in lib/logic.ts - evidence-based, not ML.
CREATE OR REPLACE FUNCTION public.recalculate_patient_urgency_from_vitals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_patient_id UUID;
  p RECORD;
  score NUMERIC := 0;
  sys_bp INT;
  hr INT;
  temp NUMERIC;
  sugar NUMERIC;
BEGIN
  target_patient_id := COALESCE(NEW.patient_id, (
    SELECT pt.id FROM patients pt WHERE pt.profile_id = NEW.profile_id LIMIT 1
  ));

  IF target_patient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO p FROM patients WHERE id = target_patient_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Demographics / condition baseline (max 25)
  IF p.status = 'Critical' THEN score := score + 20; END IF;
  IF p.age < 5 OR p.age > 65 THEN score := score + 8; END IF;
  IF p.risk_level IN ('High', 'Critical') THEN score := score + 12; END IF;
  IF COALESCE(p.follow_up_urgent, FALSE) THEN score := score + 10; END IF;

  -- Latest vitals row including this insert
  hr := NEW.heart_rate;
  temp := NEW.temperature;
  sugar := NEW.blood_sugar;

  IF hr IS NOT NULL THEN
    IF hr <= 40 OR hr >= 131 THEN score := score + 15;
    ELSIF hr <= 50 OR hr >= 111 THEN score := score + 8;
    ELSIF hr >= 91 THEN score := score + 4;
    END IF;
  END IF;

  IF temp IS NOT NULL THEN
    IF temp <= 35.0 OR temp >= 39.0 THEN score := score + 12;
    ELSIF temp >= 38.0 THEN score := score + 6;
    END IF;
  END IF;

  IF sugar IS NOT NULL THEN
    IF sugar >= 250 OR sugar <= 54 THEN score := score + 12;
    ELSIF sugar >= 180 THEN score := score + 6;
    END IF;
  END IF;

  IF NEW.blood_pressure IS NOT NULL AND NEW.blood_pressure ~ '^\d+' THEN
    sys_bp := (regexp_match(NEW.blood_pressure, '^(\d+)'))[1]::INT;
    IF sys_bp <= 90 OR sys_bp >= 220 THEN score := score + 15;
    ELSIF sys_bp >= 160 THEN score := score + 8;
    ELSIF sys_bp >= 140 THEN score := score + 4;
    END IF;
  END IF;

  score := LEAST(score, 100);

  UPDATE patients
  SET urgency_score = score,
      urgency_score_updated_at = NOW()
  WHERE id = target_patient_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_vitals_urgency ON public.patient_vitals;
CREATE TRIGGER trg_patient_vitals_urgency
  AFTER INSERT ON public.patient_vitals
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_patient_urgency_from_vitals();
