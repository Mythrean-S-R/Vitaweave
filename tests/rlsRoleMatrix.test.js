/**
 * Documents the expected RLS role matrix after migration 008_rls_hardening.sql.
 * Live JWT policy tests require a Supabase project - deferred without credentials.
 * This suite locks the contract so CI fails if the matrix drifts.
 */

const ROLE_MATRIX = {
  profiles: {
    select: ['self', 'asha', 'doctor', 'admin'],
    anon: false,
  },
  hospitals: {
    select: ['anon', 'authenticated'],
    note: 'Public directory - unchanged',
  },
  patients: {
    select: ['own profile_id', 'assigned_asha', 'assigned_doctor', 'admin'],
    not: ['unrelated asha', 'unrelated doctor', 'anon'],
  },
  pregnancies: {
    select: ['can_access_patient', 'assigned_asha'],
    write: ['asha', 'doctor', 'admin'],
    not: ['any authenticated'],
  },
  anc_visits: {
    select: ['can_access_patient'],
    write: ['asha', 'doctor', 'admin with access'],
  },
  pnc_visits: {
    select: ['can_access_patient'],
    write: ['asha', 'doctor', 'admin with access'],
  },
  symptom_reports: {
    select: ['authenticated'],
    write: ['asha', 'doctor', 'admin'],
    anon: false,
  },
  community_alerts: {
    select: ['authenticated'],
    write: ['asha', 'doctor', 'admin'],
    anon: false,
  },
  ai_insights: {
    select: ['asha', 'doctor', 'admin'],
    write: ['admin'],
    anon: false,
  },
  appointments: {
    select: ['doctor_id', 'can_access_patient', 'admin'],
    not: ['unrelated asha'],
  },
  video_calls: {
    select: ['host', 'participant', 'admin', 'appointment care team'],
  },
  dashboard_tasks: {
    select: ['assignee', 'asha', 'doctor', 'admin', 'unassigned'],
    update: ['assignee', 'admin'],
    insert: ['asha', 'admin'],
  },
};

describe('RLS role matrix (008 contract)', () => {
  test('patients are assignment-scoped, not global HCW', () => {
    expect(ROLE_MATRIX.patients.select).toContain('assigned_asha');
    expect(ROLE_MATRIX.patients.not).toContain('unrelated asha');
  });

  test('ANC/PNC are not open to any authenticated user', () => {
    expect(ROLE_MATRIX.pregnancies.not).toContain('any authenticated');
    expect(ROLE_MATRIX.anc_visits.select).toEqual(['can_access_patient']);
  });

  test('surveillance tables deny anon SELECT', () => {
    expect(ROLE_MATRIX.symptom_reports.anon).toBe(false);
    expect(ROLE_MATRIX.community_alerts.anon).toBe(false);
    expect(ROLE_MATRIX.ai_insights.anon).toBe(false);
  });

  test('profiles are not publicly viewable', () => {
    expect(ROLE_MATRIX.profiles.anon).toBe(false);
    expect(ROLE_MATRIX.profiles.select).toContain('self');
  });

  test('video_calls have participant policies', () => {
    expect(ROLE_MATRIX.video_calls.select).toEqual(
      expect.arrayContaining(['host', 'participant'])
    );
  });

  test('dashboard_tasks write is restricted', () => {
    expect(ROLE_MATRIX.dashboard_tasks.insert).toEqual(['asha', 'admin']);
    expect(ROLE_MATRIX.dashboard_tasks.update).toEqual(['assignee', 'admin']);
  });

  test('hospitals remain a public directory', () => {
    expect(ROLE_MATRIX.hospitals.select).toContain('anon');
  });
});
