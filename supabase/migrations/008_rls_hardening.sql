-- VitaWeave 008 - RLS hardening + parental consent columns
-- Replaces open USING (true) / global HCW policies with assignment-scoped access.
-- Additive: does not rewrite historical migrations.

ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_relationship TEXT,
  ADD COLUMN IF NOT EXISTS guardian_acknowledged BOOLEAN DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER + locked search_path to avoid profiles RLS recursion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY(roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_patient(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients pt
    WHERE pt.id = p_id AND (
      pt.profile_id = auth.uid()
      OR pt.assigned_asha_id = auth.uid()
      OR pt.assigned_doctor_id = auth.uid()
      OR public.has_role(ARRAY['admin'])
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_patient_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_profile_id = auth.uid()
    OR public.has_role(ARRAY['admin'])
    OR EXISTS (
      SELECT 1 FROM public.patients pt
      WHERE pt.profile_id = p_profile_id
        AND (pt.assigned_asha_id = auth.uid() OR pt.assigned_doctor_id = auth.uid())
    )
$$;

GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_patient(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_patient_profile(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- profiles: drop public SELECT; self + HCW/admin
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by self or care team" ON public.profiles;
CREATE POLICY "Profiles viewable by self or care team"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(ARRAY['asha', 'doctor', 'admin'])
);

-- ---------------------------------------------------------------------------
-- patients: assignment-scoped (not any asha/doctor)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Patients viewable by healthcare workers or self" ON public.patients;
CREATE POLICY "Patients viewable by healthcare workers or self"
ON public.patients FOR SELECT TO authenticated
USING (
  profile_id = auth.uid()
  OR assigned_asha_id = auth.uid()
  OR assigned_doctor_id = auth.uid()
  OR public.has_role(ARRAY['admin'])
);

DROP POLICY IF EXISTS "Healthcare workers can insert patients" ON public.patients;
CREATE POLICY "Healthcare workers can insert patients"
ON public.patients FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(ARRAY['asha', 'doctor', 'admin'])
  OR profile_id = auth.uid()
);

DROP POLICY IF EXISTS "Healthcare workers can update patients" ON public.patients;
CREATE POLICY "Healthcare workers can update patients"
ON public.patients FOR UPDATE TO authenticated
USING (
  profile_id = auth.uid()
  OR assigned_asha_id = auth.uid()
  OR assigned_doctor_id = auth.uid()
  OR public.has_role(ARRAY['admin'])
)
WITH CHECK (
  profile_id = auth.uid()
  OR assigned_asha_id = auth.uid()
  OR assigned_doctor_id = auth.uid()
  OR public.has_role(ARRAY['admin'])
);

-- ---------------------------------------------------------------------------
-- patient_vitals / patient_medications: assignment-scoped via profile
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own vitals" ON public.patient_vitals;
CREATE POLICY "Users can view own vitals"
ON public.patient_vitals FOR SELECT TO authenticated
USING (public.can_access_patient_profile(profile_id));

DROP POLICY IF EXISTS "Care team can insert vitals" ON public.patient_vitals;
CREATE POLICY "Care team can insert vitals"
ON public.patient_vitals FOR INSERT TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  OR public.has_role(ARRAY['asha', 'doctor', 'admin'])
);

DROP POLICY IF EXISTS "Users can view own medications" ON public.patient_medications;
CREATE POLICY "Users can view own medications"
ON public.patient_medications FOR SELECT TO authenticated
USING (public.can_access_patient_profile(profile_id));

DROP POLICY IF EXISTS "Healthcare workers can manage medications" ON public.patient_medications;
CREATE POLICY "Healthcare workers can manage medications"
ON public.patient_medications FOR ALL TO authenticated
USING (public.can_access_patient_profile(profile_id))
WITH CHECK (
  profile_id = auth.uid()
  OR public.has_role(ARRAY['asha', 'doctor', 'admin'])
);

-- ---------------------------------------------------------------------------
-- ANC / PNC: replace open USING (true)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS pregnancies_all ON public.pregnancies;
CREATE POLICY pregnancies_select ON public.pregnancies FOR SELECT TO authenticated
USING (
  public.can_access_patient(patient_id)
  OR assigned_asha_id = auth.uid()
);
CREATE POLICY pregnancies_write ON public.pregnancies FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(ARRAY['asha', 'doctor', 'admin'])
  AND (public.can_access_patient(patient_id) OR assigned_asha_id = auth.uid() OR public.has_role(ARRAY['admin']))
);
CREATE POLICY pregnancies_update ON public.pregnancies FOR UPDATE TO authenticated
USING (
  public.can_access_patient(patient_id)
  OR assigned_asha_id = auth.uid()
)
WITH CHECK (
  public.has_role(ARRAY['asha', 'doctor', 'admin'])
);

DROP POLICY IF EXISTS anc_visits_all ON public.anc_visits;
CREATE POLICY anc_visits_select ON public.anc_visits FOR SELECT TO authenticated
USING (public.can_access_patient(patient_id));
CREATE POLICY anc_visits_write ON public.anc_visits FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(ARRAY['asha', 'doctor', 'admin'])
  AND public.can_access_patient(patient_id)
);
CREATE POLICY anc_visits_update ON public.anc_visits FOR UPDATE TO authenticated
USING (public.can_access_patient(patient_id) AND public.has_role(ARRAY['asha', 'doctor', 'admin']))
WITH CHECK (public.has_role(ARRAY['asha', 'doctor', 'admin']));

DROP POLICY IF EXISTS pnc_visits_all ON public.pnc_visits;
CREATE POLICY pnc_visits_select ON public.pnc_visits FOR SELECT TO authenticated
USING (public.can_access_patient(patient_id));
CREATE POLICY pnc_visits_write ON public.pnc_visits FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(ARRAY['asha', 'doctor', 'admin'])
  AND public.can_access_patient(patient_id)
);
CREATE POLICY pnc_visits_update ON public.pnc_visits FOR UPDATE TO authenticated
USING (public.can_access_patient(patient_id) AND public.has_role(ARRAY['asha', 'doctor', 'admin']))
WITH CHECK (public.has_role(ARRAY['asha', 'doctor', 'admin']));

-- ---------------------------------------------------------------------------
-- Surveillance / aggregate tables: authenticated SELECT (not anon); HCW writes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public community alerts are viewable by everyone" ON public.community_alerts;
DROP POLICY IF EXISTS "Authenticated can view community alerts" ON public.community_alerts;
CREATE POLICY "Authenticated can view community alerts"
ON public.community_alerts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "HCW can write community alerts" ON public.community_alerts;
CREATE POLICY "HCW can write community alerts"
ON public.community_alerts FOR ALL TO authenticated
USING (public.has_role(ARRAY['asha', 'doctor', 'admin']))
WITH CHECK (public.has_role(ARRAY['asha', 'doctor', 'admin']));

DROP POLICY IF EXISTS "Public weekly alerts are viewable by everyone" ON public.weekly_alerts;
DROP POLICY IF EXISTS "Authenticated can view weekly alerts" ON public.weekly_alerts;
CREATE POLICY "Authenticated can view weekly alerts"
ON public.weekly_alerts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "HCW can write weekly alerts" ON public.weekly_alerts;
CREATE POLICY "HCW can write weekly alerts"
ON public.weekly_alerts FOR ALL TO authenticated
USING (public.has_role(ARRAY['asha', 'doctor', 'admin']))
WITH CHECK (public.has_role(ARRAY['asha', 'doctor', 'admin']));

DROP POLICY IF EXISTS "Public trends are viewable by everyone" ON public.pharmacy_trends;
DROP POLICY IF EXISTS "Authenticated can view pharmacy trends" ON public.pharmacy_trends;
CREATE POLICY "Authenticated can view pharmacy trends"
ON public.pharmacy_trends FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "HCW can write pharmacy trends" ON public.pharmacy_trends;
CREATE POLICY "HCW can write pharmacy trends"
ON public.pharmacy_trends FOR ALL TO authenticated
USING (public.has_role(ARRAY['asha', 'doctor', 'admin']))
WITH CHECK (public.has_role(ARRAY['asha', 'doctor', 'admin']));

DROP POLICY IF EXISTS "Public symptom reports are viewable by everyone" ON public.symptom_reports;
DROP POLICY IF EXISTS "Authenticated can view symptom reports" ON public.symptom_reports;
CREATE POLICY "Authenticated can view symptom reports"
ON public.symptom_reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "HCW can write symptom reports" ON public.symptom_reports;
CREATE POLICY "HCW can write symptom reports"
ON public.symptom_reports FOR ALL TO authenticated
USING (public.has_role(ARRAY['asha', 'doctor', 'admin']))
WITH CHECK (public.has_role(ARRAY['asha', 'doctor', 'admin']));

DROP POLICY IF EXISTS "Public weekly trends are viewable by everyone" ON public.weekly_trends;
DROP POLICY IF EXISTS "Authenticated can view weekly trends" ON public.weekly_trends;
CREATE POLICY "Authenticated can view weekly trends"
ON public.weekly_trends FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "HCW can write weekly trends" ON public.weekly_trends;
CREATE POLICY "HCW can write weekly trends"
ON public.weekly_trends FOR ALL TO authenticated
USING (public.has_role(ARRAY['asha', 'doctor', 'admin']))
WITH CHECK (public.has_role(ARRAY['asha', 'doctor', 'admin']));

DROP POLICY IF EXISTS "Public AI insights are viewable by everyone" ON public.ai_insights;
DROP POLICY IF EXISTS "HCW can view AI insights" ON public.ai_insights;
CREATE POLICY "HCW can view AI insights"
ON public.ai_insights FOR SELECT TO authenticated
USING (public.has_role(ARRAY['asha', 'doctor', 'admin']));
DROP POLICY IF EXISTS "Admin can write AI insights" ON public.ai_insights;
CREATE POLICY "Admin can write AI insights"
ON public.ai_insights FOR ALL TO authenticated
USING (public.has_role(ARRAY['admin']))
WITH CHECK (public.has_role(ARRAY['admin']));

-- hospitals stay public (directory) - no change

-- ---------------------------------------------------------------------------
-- appointments: asha limited to assigned patients
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view relevant appointments" ON public.appointments;
CREATE POLICY "Users can view relevant appointments"
ON public.appointments FOR SELECT TO authenticated
USING (
  doctor_id = auth.uid()
  OR public.can_access_patient(patient_id)
  OR public.has_role(ARRAY['admin'])
);

-- ---------------------------------------------------------------------------
-- vaccinations: tighten SELECT (remove global asha)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Healthcare workers can view vaccinations" ON public.vaccinations;
CREATE POLICY "Healthcare workers can view vaccinations"
ON public.vaccinations FOR SELECT TO authenticated
USING (
  assigned_asha_id = auth.uid()
  OR public.can_access_patient(patient_id)
  OR public.has_role(ARRAY['doctor', 'admin'])
);

DROP POLICY IF EXISTS "ASHA workers can manage vaccinations" ON public.vaccinations;
CREATE POLICY "ASHA workers can manage vaccinations"
ON public.vaccinations FOR ALL TO authenticated
USING (
  assigned_asha_id = auth.uid()
  OR public.has_role(ARRAY['admin'])
  OR (public.has_role(ARRAY['asha']) AND public.can_access_patient(patient_id))
)
WITH CHECK (
  assigned_asha_id = auth.uid()
  OR public.has_role(ARRAY['asha', 'admin'])
);

-- ---------------------------------------------------------------------------
-- dashboard_tasks: SELECT + UPDATE assignee + INSERT asha/admin
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Dashboard tasks viewable by care team" ON public.dashboard_tasks;
DROP POLICY IF EXISTS "Tasks viewable by assigned user or healthcare workers" ON public.dashboard_tasks;
CREATE POLICY "Dashboard tasks viewable by care team"
ON public.dashboard_tasks FOR SELECT TO authenticated
USING (
  assigned_to IS NULL
  OR assigned_to = auth.uid()
  OR public.has_role(ARRAY['asha', 'doctor', 'admin'])
);

DROP POLICY IF EXISTS "Dashboard tasks update by assignee" ON public.dashboard_tasks;
CREATE POLICY "Dashboard tasks update by assignee"
ON public.dashboard_tasks FOR UPDATE TO authenticated
USING (
  assigned_to = auth.uid()
  OR public.has_role(ARRAY['admin'])
)
WITH CHECK (
  assigned_to = auth.uid()
  OR public.has_role(ARRAY['admin'])
);

DROP POLICY IF EXISTS "Dashboard tasks insert by asha admin" ON public.dashboard_tasks;
CREATE POLICY "Dashboard tasks insert by asha admin"
ON public.dashboard_tasks FOR INSERT TO authenticated
WITH CHECK (public.has_role(ARRAY['asha', 'admin']));

-- ---------------------------------------------------------------------------
-- video_calls: participants + care team on linked appointment patient
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Video calls viewable by participants" ON public.video_calls;
CREATE POLICY "Video calls viewable by participants"
ON public.video_calls FOR SELECT TO authenticated
USING (
  host_id = auth.uid()
  OR participant_id = auth.uid()
  OR public.has_role(ARRAY['admin'])
  OR (
    appointment_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id
        AND (a.doctor_id = auth.uid() OR public.can_access_patient(a.patient_id))
    )
  )
);

DROP POLICY IF EXISTS "Video calls manage by participants" ON public.video_calls;
CREATE POLICY "Video calls manage by participants"
ON public.video_calls FOR ALL TO authenticated
USING (
  host_id = auth.uid()
  OR participant_id = auth.uid()
  OR public.has_role(ARRAY['doctor', 'admin'])
)
WITH CHECK (
  host_id = auth.uid()
  OR participant_id = auth.uid()
  OR public.has_role(ARRAY['doctor', 'admin'])
);
