# Product Roadmap

What is **shipped in this repository** vs **planned / aspirational** (including ideas from earlier project descriptions).

---

## Shipped (v1.2 - partial-features completion)

### Platform
- [x] **Local-first WatermelonDB** (`lib/db` + `lib/sync/SyncService`) with encrypted sensitive fields + SecureStore offline session
- [x] Offline auth resume + sync-on-reconnect
- [x] HTTPS + `EXPO_PUBLIC_SUPABASE_REGION=ap-south-1` residency guards
- [x] ANC/PNC tracking (`app/(asha)/anc-pnc.tsx`, migration `004`)
- [x] India UIP immunization schedule generator + vaccination print/share report
- [x] Referral ladder PHC / CHC / District Hospital (`005`)
- [x] Vitals capture + voice dictation on clinical notes / visit
- [x] Clinical audit via `withAudit` / `logAuditEvent` on key mutations
- [x] DPDP export/erasure UI + `consent_records` / `data_rights` edge function (`006`)
- [x] ABHA M2 linking UX + M3 HIU scaffold via `AbdmClient` (mock/dev; DisabledAbdmClient in production without live URL)
- [x] ABDM-format e-prescription builder on record visit
- [x] Telemedicine remote `RtcSurfaceView` (doctor + patient) + join events + poor-network audio-only
- [x] Doctor report summarization with Gemini vision OCR (`summarize-report`)
- [x] Outbreak cluster detector + campaign create/publish push (`007`)
- [x] RLS hardening migration `008` + edge cron/role auth

---

## Shipped (v1.1 pilot)

### Platform
- [x] Expo 57 multi-role app (ASHA, doctor, patient, **district supervisor**)
- [x] Supabase Auth + profiles
- [x] Full schema with RLS (`complete_schema.sql`) + migrations `002_core_features.sql`, `003_tier3_compliance.sql`
- [x] Gemini AI assistant + edge proxy (language-aware)
- [x] Agora telemedicine integration (native build)
- [x] Appointment lifecycle: Scheduled → Active → Completed
- [x] Sentry, consent, PHI utilities
- [x] CI: lint, typecheck, unit tests
- [x] **Offline-first write queue** (`writeThroughQueue` + `syncEngine`)
- [x] **Server push** via Expo Push API (`send-push` edge function + `push_tokens`)
- [x] Local + server care notifications
- [x] Profile screens wired to Supabase
- [x] **i18n** - English, Hindi, Tamil (`lib/i18n`, `LanguagePicker`)
- [x] **Voice input** - `expo-speech-recognition` (replaces deprecated `@react-native-voice/voice`)
- [x] **Priority scoring** - rule-based vitals triage (NEWS2 + maternal risk references); UI copy says "priority score"
- [x] **Audit trail** - `audit_log`, `scoring_audit`, ASHA compliance logs

### ASHA
- [x] Dashboard (tasks, alerts, patients count, field route map)
- [x] Patient registry + triage persistence with priority score
- [x] Vaccination tracking
- [x] Community signals
- [x] AI task generation (`daily-task-generation` edge function)
- [x] Referrals (send + inbox)
- [x] Gig / field compliance logging on dashboard load

### Doctor
- [x] Dashboard with urgency-sorted queue + manual override
- [x] Appointments + telemedicine join
- [x] Record visit + clinical workflow
- [x] Campaigns list
- [x] Add patient
- [x] Referrals inbox

### Patient
- [x] Dashboard with medication reminders (tap to mark dose)
- [x] Book appointment
- [x] Appointments list
- [x] Profile with health summary
- [x] **ABHA M1 placeholder** - read-only card when `abha_id` is set (full HIP/HIU deferred)

### Supervisor (`/(admin)`)
- [x] District metrics dashboard
- [x] Audit log + scoring audit views
- [x] Login via `admin-login` (linked from main login)

---

## In progress / needs hardening

| Item | Status | Notes |
|------|--------|-------|
| Remote Agora video render | Code-complete | Device QA on two physical EAS builds still required (org) |
| Integration test suite | Deferred | User to enable after env setup |
| ABHA live HIP/HIU | Deferred | Scaffold shipped; live NHA gateway credentials required |
| DHIS2 export | Not started | CSV export planned |
| SMS OTP auth | Not started | Email/password today |

---

## Phase 2 - Field pilot readiness

- [x] Background sync queue for low connectivity
- [x] Hindi / Tamil UI pass (en/hi/ta strings; expand coverage)
- [x] Admin dashboard for district supervisors
- [x] Server-triggered push via Supabase Edge + Expo Push
- [ ] SMS OTP auth for workers without email
- [ ] Export CSV / DHIS2 adapter
- [ ] Medication reminder push at scheduled times (background scheduler)

---

## Phase 3 - Scale & compliance

- [x] Audit log table (`audit_log`, `scoring_audit`)
- [x] ASHA gig compliance logs (`asha_compliance_logs`)
- [ ] Automated data export / erasure (DPDP rights)
- [ ] Session timeout + biometric unlock
- [ ] HIPAA documentation package
- [ ] Load testing on RLS policies
- [ ] Supabase branching for migrations

### ABHA interoperability

| Milestone | Scope | Status |
|-----------|-------|--------|
| **M1** | `patients.abha_id` column + read-only profile card | Shipped |
| **M2** | ABHA linking UX (`AbhaLinkCard` + `AbdmClient.linkAbha` / `verifyOtp`) | Scaffold shipped; live deferred pending NHA credentials |
| **M3** | HIU consent + record fetch (`requestConsent` / `fetchRecords`) | Scaffold shipped; live deferred pending NHA credentials |

Production builds never use MockAbdmClient. Without `EXPO_PUBLIC_ABDM_BASE_URL`, ABDM UI shows a disabled state. Full live HIP/HIU still needs sandbox credentials, consent artefact storage, and legal review.

---

## Future vision (not in repo)

These appeared in legacy README / pitch decks but are **not implemented**:

| Feature | Description |
|---------|-------------|
| **Maternal wearables** | IoT vitals stream into `patient_vitals` |
| **Healthcare Benefits Navigator** | Firecrawl + rules engine for govt schemes |
| **MedRide** | Emergency transport routing |
| **Blockchain records** | Replaced by Postgres + RLS + audit logs |
| **Django backend** | Replaced by Supabase |
| **Federated learning** | Research-stage only |
| **TensorFlow Lite on-device** | Could complement rule-based scoring for offline triage |

---

## How to prioritize

For **government pilot**: SMS auth, DHIS2 export, ABHA M2, medication push scheduler.  
For **investor demo**: telemedicine polish, priority scoring story, ward risk visualization.  
For **clinical safety**: disclaimers, audit logs, pen test.

---

## Version history

| Version | Milestone |
|---------|-----------|
| 0.x | UI prototypes with mock data |
| 1.0 | Supabase integration Phases 1–5 |
| 1.1 | Tier 1–3: offline sync, referrals, priority scoring, i18n, admin, push, audit |
| 2.0 | (planned) ABHA M2/M3 + DHIS2 + SMS auth |

Update `EXPO_PUBLIC_APP_VERSION` and store build numbers per release.
