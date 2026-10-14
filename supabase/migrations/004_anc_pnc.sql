-- VitaWeave 004 - ANC / PNC tracking
CREATE TABLE IF NOT EXISTS public.pregnancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  lmp DATE,
  edd DATE,
  gravida INT,
  para INT,
  risk_flags JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'delivered', 'closed')),
  assigned_asha_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.anc_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregnancy_id UUID NOT NULL REFERENCES public.pregnancies(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_number INT NOT NULL CHECK (visit_number >= 1),
  visit_date DATE,
  findings TEXT,
  bp TEXT,
  weight NUMERIC,
  hb NUMERIC,
  next_due DATE,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pnc_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregnancy_id UUID NOT NULL REFERENCES public.pregnancies(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_day INT NOT NULL CHECK (visit_day IN (1, 3, 7, 42)),
  visit_date DATE,
  findings TEXT,
  mother_well BOOLEAN DEFAULT TRUE,
  baby_well BOOLEAN DEFAULT TRUE,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS date_of_birth DATE;

CREATE INDEX IF NOT EXISTS idx_pregnancies_patient ON public.pregnancies(patient_id);
CREATE INDEX IF NOT EXISTS idx_anc_pregnancy ON public.anc_visits(pregnancy_id);
CREATE INDEX IF NOT EXISTS idx_pnc_pregnancy ON public.pnc_visits(pregnancy_id);

ALTER TABLE public.pregnancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anc_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnc_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pregnancies_all ON public.pregnancies;
CREATE POLICY pregnancies_all ON public.pregnancies FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anc_visits_all ON public.anc_visits;
CREATE POLICY anc_visits_all ON public.anc_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pnc_visits_all ON public.pnc_visits;
CREATE POLICY pnc_visits_all ON public.pnc_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
