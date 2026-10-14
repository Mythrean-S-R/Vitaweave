-- ==============================================================================
-- VitaWeave - seed demo users for ASHA, Doctor, and Patient
-- Run in Supabase Dashboard → SQL Editor
--
-- Login credentials (all three accounts):
--   Password: VitaWeave@123
--
-- Emails:
--   asha@vitaweave.test
--   doctor@vitaweave.test
--   patient@vitaweave.test
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fixed UUIDs so you can reference them in other seed data
-- ASHA:    a1111111-1111-4111-8111-111111111111
-- Doctor:  d2222222-2222-4222-8222-222222222222
-- Patient: c3333333-3333-4333-8333-333333333333  (must be hex: 0-9, a-f only - no "p")

DO $$
DECLARE
  v_instance_id UUID := '00000000-0000-0000-0000-000000000000';
  v_password TEXT := crypt('vitaweave123', gen_salt('bf'));
BEGIN
  -- --------------------------------------------------------------------------
  -- 1) ASHA worker
  -- --------------------------------------------------------------------------
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    'a1111111-1111-4111-8111-111111111111',
    v_instance_id,
    'authenticated',
    'authenticated',
    'asha@vitaweave.test',
    v_password,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Shalini","role":"asha"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    'a1111111-1111-4111-8111-111111111111',
    'a1111111-1111-4111-8111-111111111111',
    jsonb_build_object(
      'sub', 'a1111111-1111-4111-8111-111111111111',
      'email', 'asha@vitaweave.test',
      'email_verified', true
    ),
    'email',
    'a1111111-1111-4111-8111-111111111111',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- --------------------------------------------------------------------------
  -- 2) Doctor
  -- --------------------------------------------------------------------------
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    'd2222222-2222-4222-8222-222222222222',
    v_instance_id,
    'authenticated',
    'authenticated',
    'doctor@vitaweave.test',
    v_password,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dr. Shalini","role":"doctor"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    'd2222222-2222-4222-8222-222222222222',
    'd2222222-2222-4222-8222-222222222222',
    jsonb_build_object(
      'sub', 'd2222222-2222-4222-8222-222222222222',
      'email', 'doctor@vitaweave.test',
      'email_verified', true
    ),
    'email',
    'd2222222-2222-4222-8222-222222222222',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- --------------------------------------------------------------------------
  -- 3) Patient
  -- --------------------------------------------------------------------------
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    'c3333333-3333-4333-8333-333333333333',
    v_instance_id,
    'authenticated',
    'authenticated',
    'patient@vitaweave.test',
    v_password,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Jay","role":"patient"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    'c3333333-3333-4333-8333-333333333333',
    'c3333333-3333-4333-8333-333333333333',
    jsonb_build_object(
      'sub', 'c3333333-3333-4333-8333-333333333333',
      'email', 'patient@vitaweave.test',
      'email_verified', true
    ),
    'email',
    'c3333333-3333-4333-8333-333333333333',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;
END $$;

-- Profiles (explicit upsert - safe even if handle_new_user trigger already ran)
INSERT INTO public.profiles (id, email, name, role, ward, language)
VALUES
  (
    'a1111111-1111-4111-8111-111111111111',
    'asha@vitaweave.test',
    'Shalini',
    'asha',
    'Ward 3',
    'English'
  ),
  (
    'd2222222-2222-4222-8222-222222222222',
    'doctor@vitaweave.test',
    'Dr. Shalini',
    'doctor',
    'OPD',
    'English'
  ),
  (
    'c3333333-3333-4333-8333-333333333333',
    'patient@vitaweave.test',
    'Jay',
    'patient',
    'Ward 3',
    'English'
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  ward = EXCLUDED.ward,
  language = EXCLUDED.language,
  updated_at = NOW();

-- Patient clinical record linked to patient profile
INSERT INTO public.patients (
  name,
  age,
  gender,
  condition,
  status,
  risk_level,
  ward,
  profile_id,
  assigned_asha_id,
  assigned_doctor_id
)
VALUES (
    'Jay',
  32,
  'Male',
  'General checkup',
  'Stable',
  'Low',
  'Ward 3',
  'c3333333-3333-4333-8333-333333333333',
  'a1111111-1111-4111-8111-111111111111',
  'd2222222-2222-4222-8222-222222222222'
)
ON CONFLICT (profile_id) DO UPDATE SET
  name = EXCLUDED.name,
  age = EXCLUDED.age,
  condition = EXCLUDED.condition,
  assigned_asha_id = EXCLUDED.assigned_asha_id,
  assigned_doctor_id = EXCLUDED.assigned_doctor_id,
  updated_at = NOW();

-- Verify
SELECT id, email, name, role, ward
FROM public.profiles
WHERE email IN (
  'asha@vitaweave.test',
  'doctor@vitaweave.test',
  'patient@vitaweave.test'
)
ORDER BY role;
