-- VitaWeave 005 - Referral ladder ASHA → PHC → CHC → District Hospital
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referred_to_type_check;

ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_referred_to_type_check
  CHECK (referred_to_type IN (
    'asha_escalate',
    'phc',
    'chc',
    'district_hospital',
    'hospital',
    'telemedicine',
    'specialist'
  ));
