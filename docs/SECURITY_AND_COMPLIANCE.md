# Security & Compliance

VitaWeave handles health-related data. This document describes the **technical controls in the repository** and what remains **organizational / legal** for production healthcare deployment.

> **Disclaimer:** This is not legal advice. Engage qualified counsel for HIPAA, India's DPDP Act 2023, CLAUDE, or state NHM data agreements.

---

## Data classification

| Data type | Examples | Storage |
|-----------|----------|---------|
| PHI | Name, phone, conditions, vitals, visit notes | Supabase PostgreSQL + **WatermelonDB (SQLite)** (sensitive columns encrypted at rest on device) |
| Credentials | Passwords | Supabase Auth (hashed) |
| Session | Offline role/user snapshot | `expo-secure-store` |
| API secrets | Gemini key, Agora certificate | Supabase Edge secrets only |
| Telemetry | Crash stacks | Sentry (scrubbed) |
| Local prefs | Consent flag, notification dedupe | AsyncStorage |

### Local-first offline

- Source of truth on device: **WatermelonDB** (`lib/db`) over SQLite (native) / LokiJS (web)
- Sync: `lib/sync/SyncService.ts` push/pull with last-write-wins merge
- Legacy AsyncStorage queue is migrated once then cleared

### Encryption & residency

- Transit: HTTPS only (`EnvValidator` rejects non-HTTPS Supabase URLs)
- Region: set `EXPO_PUBLIC_SUPABASE_REGION=ap-south-1` (Mumbai) for India pilots
- Device at-rest: `lib/db/fieldEncryption.ts` for phone, ABHA, notes, prescription
- Remote at-rest: Supabase-managed (document DPA/BAA with vendor for production)

### DPDP rights

- In-app **Download my data** / **Request erasure** on patient profile
- Tables: `consent_records`, `data_rights_requests` (migration `006`)
- Edge function: `supabase/functions/data-rights`

### ABDM adapters

- Development may use `EXPO_PUBLIC_ABDM_MODE=mock` (OTP `123456`) for demos
- Production builds never use MockAbdmClient; without live base URL, ABDM is disabled
- Set `live` + `EXPO_PUBLIC_ABDM_BASE_URL` when NHA sandbox credentials exist

---

## Controls implemented in code

### 1. Authentication & authorization

- Supabase Auth JWT for all API calls
- `completeRoleLogin()` enforces role match at login
- `useRoleGuard()` prevents cross-role route access
- Row Level Security on clinical tables (see `complete_schema.sql`)

### 2. Secret management

| Secret | Location |
|--------|----------|
| `GEMINI_API_KEY` | Supabase Edge Function secret |
| `AGORA_APP_CERTIFICATE` | Supabase Edge Function secret |
| `SUPABASE_ANON_KEY` | Client (public by design; RLS protects data) |
| Service role key | **Never** in client |

Production should set `EXPO_PUBLIC_USE_EDGE_PROXY=true`.

### 3. PHI redaction

`lib/phiSecurity.ts`:

- `redactPhi(text)` - masks phone, email patterns
- `scrubObject(obj)` - recursive redaction for logs
- Used before Sentry breadcrumbs and analytics events

### 4. Consent

- `app/consent.tsx` - explicit accept before app use
- `lib/consent.ts` - persists acceptance locally
- `app/privacy-policy.tsx` - linked from consent flow
- `app.json` → `extra.privacyPolicyUrl` for store listings

### 5. Transport security

- Supabase client uses HTTPS
- Agora RTC encrypted channels (vendor default)

### 6. Error monitoring

- Sentry DSN is public client key (standard pattern)
- `beforeSend` hooks should strip PHI (extend in `lib/sentry.ts` as needed)

### 7. Audit logging

- `audit_log` - access events (login, patient record reads) via `lib/auditLog.ts`; queue-first for offline
- `scoring_audit` - priority score changes after triage via `lib/scoringAudit.ts`
- `asha_compliance_logs` - daily field activity summaries via `lib/gigCompliance.ts`
- Supervisor role (`admin`) can read district metrics and audit tables (RLS in `003_tier3_compliance.sql`)

---

## Row Level Security model

Principles (enforced by migration `008_rls_hardening.sql`):

1. **Default deny** - RLS enabled; policies grant minimum access
2. **ASHA** - CRUD on assigned `patients` only (`assigned_asha_id`); read ward alerts/tasks
3. **Doctor** - appointments where `doctor_id = auth.uid()`; patients in caseload (`assigned_doctor_id`)
4. **Patient** - rows where `profile_id = auth.uid()` or linked patient id via `can_access_patient()`
5. **Admin** - full patient access; metrics/audit tables; AI insights write

Helpers: `current_role()`, `has_role(text[])`, `can_access_patient(uuid)`, `can_access_patient_profile(uuid)`.

| Table | Access |
|-------|--------|
| `profiles` | Self + authenticated HCW/admin (not anon) |
| `hospitals` | Public directory (unchanged) |
| `patients` / vitals / meds | Assignment or self; not global HCW |
| `pregnancies` / ANC / PNC | `can_access_patient`; HCW write |
| Surveillance aggregates | Authenticated SELECT; HCW write; `ai_insights` admin write |
| `appointments` | Doctor, care-team patient, admin |
| `video_calls` | Host / participant / appointment care team |
| `dashboard_tasks` | SELECT care team; UPDATE assignee; INSERT asha/admin |

Contract tests: `tests/rlsRoleMatrix.test.js`. Live JWT policy tests: run with three role tokens after credentials exist.

---

## Compliance pathways

### India DPDP Act 2023

| Requirement | VitaWeave support |
|-------------|-------------------|
| Notice & consent | Consent screen + privacy policy |
| Purpose limitation | Role-scoped data access |
| Data minimization | Only required fields in schema |
| Security safeguards | RLS, encryption in transit, secret proxy |
| Data principal rights | Manual export/delete via Supabase admin (automate in roadmap) |
| ABHA health ID | M1 storage + M2/M3 scaffold; live NHA gateway deferred (org credentials) |

### HIPAA (US pilots)

Would require:

- BAA with Supabase (Teams/Enterprise)
- Audit logging (`audit_log`, `scoring_audit` - implemented)
- Access controls documentation
- Breach notification procedures

Architecture (RLS, consent, PHI scrubbing) is a **foundation**, not certification.

---

## Threat model (simplified)

| Threat | Mitigation |
|--------|------------|
| Stolen phone | OS screen lock; session timeout (add in roadmap) |
| Anon key abuse | RLS; rate limiting via Supabase |
| API key in APK | Edge proxy for Gemini/Agora cert |
| Insider ASHA views wrong ward | RLS `asha_id` filter |
| Log leakage | phiSecurity scrubbing |

---

## Secure development practices

1. Never commit `.env`
2. Rotate keys if exposed
3. Use separate Supabase projects per environment
4. Run `npm audit` periodically (known transitive issues in dev deps)
5. Code review for direct `supabase` calls bypassing `api.ts`

---

## Incident response (recommended org process)

1. Revoke compromised API keys in Supabase/Google/Agora consoles
2. Force password reset via Supabase Auth
3. Review `video_calls` and `medical_records` audit tables for anomalous access
4. Notify DPO / legal per jurisdictional requirements

---

## Children's data

Parental/guardian consent is implemented in `app/consent.tsx` + `lib/consent.ts` (guardian name, relationship, acknowledgment) and persisted to `consent_records` (`is_minor`, `guardian_*` columns in migration `008`). Required before pediatric pilots; legal review of copy remains an org step.

---

## AI governance

- Gemini outputs are **assistive**, not diagnostic
- UI should display disclaimers on AI screens
- Chat stored in `ai_chat_history` - include in data retention policy
- Review prompts in `lib/gemini.ts` for safety bias
- Report OCR uses Gemini vision - assistive extract only; clinician must verify

---

## Checklist before public launch

### Code / repo (done when migrations + builds use these settings)

- [x] `EXPO_PUBLIC_DEV_MODE` hard-disabled when `NODE_ENV=production` (`lib/devMode.ts`)
- [x] Edge proxy default on for preview/production EAS (`eas.json`)
- [x] RLS hardening migration `008` + role matrix contract tests
- [x] Edge auth: `CRON_SECRET` for daily-task-generation; HCW role on send-push; participant check on agora-token
- [x] Mock ABDM refused in production (`DisabledAbdmClient`)
- [x] Parental/guardian consent UX
- [x] In-app privacy policy content (canonical until public URL hosted)

### Owner: organization (not closable in this repo)

- [ ] Fill EAS project ID + Apple submit IDs (see `docs/DEPLOYMENT.md`)
- [ ] Host public privacy policy at `app.json` → `extra.privacyPolicyUrl`
- [ ] NHA/ABDM live sandbox credentials + legal review
- [ ] Apply migrations `002`–`008` on production Supabase; JWT RLS smoke test per role
- [ ] Sentry PHI scrubbing verified in staging
- [ ] Penetration test or third-party security review
- [ ] Data processing agreement with Supabase
- [ ] App store privacy nutrition labels completed
- [ ] Two-device Agora telemedicine QA on EAS builds
