# Internal Logic Reference

This document explains **how business rules are implemented** in code - intended for engineers onboarding to VitaWeave or auditors tracing behavior.

---

## Role model

Defined in `lib/roles.ts`:

| Role | Route prefix | Primary tables |
|------|--------------|----------------|
| `asha` | `/(asha)` | patients, dashboard_tasks, vaccinations, community_alerts |
| `doctor` | `/(doctor)` | appointments, medical_records, campaigns, video_calls |
| `patient` | `/(patient)` | appointments (own), patient_vitals, patient_medications |
| `admin` | (reserved) | future admin console |

`useRoleGuard(expectedRole)` in each `_layout.tsx` redirects to `/login` if AsyncStorage role mismatches.

---

## Data policy (demo vs live)

`lib/dataPolicy.ts` - `resolveWithDemoFallback(liveData, demoSeed)`:

- If `EXPO_PUBLIC_DEV_MODE=true` **and** live query returns empty → show seed data from `app/constants/data.ts`
- If dev mode off → always show live results (empty states via `EmptyState` component)

**Why:** Enables UI demos and training without seeding Supabase; prevents accidental demo data in production when env is set correctly.

---

## Patient identity mapping

`lib/patientMapper.ts` bridges:

- **`patients` table** - clinical record (`id` UUID, `profile_id` optional link to auth user)
- **UI `Patient` type** - `app/constants/data.ts` (`id: string`, risk, vitals summary)

Caregivers see patients via `getPatientsForCaregiver(userId, role)` which filters by `asha_id` or doctor assignment columns per RLS.

---

## ASHA workflows

### Dashboard (`app/(asha)/index.tsx`)

On load:
1. `getDashboardTasks()` - urgent/today/routine tasks
2. `getWeeklyAlerts()` - epidemiological-style alerts
3. `getPatientsForCaregiver(ashaId, 'asha')` - assigned patients
4. `syncRoleNotifications(ashaId, 'asha')` - local push digest

AI task generation (`generateAITaskSuggestions`) calls Gemini, then `addDashboardTask()` for each suggestion.

### Patient triage (`app/(asha)/patients.tsx`)

Risk change → `updatePatientRisk(patientId, level)` → updates `patients.risk_level`.

Community signals screen reads `getCommunityAlerts()` and `summarizeCommunitySignals()` from `lib/communityHealth.ts` to compute ward risk banner.

### Vaccinations (`app/(asha)/vaccinations.tsx`)

CRUD via `getVaccinations`, `addVaccination`, `updateVaccinationStatus` in `api.ts`.  
Status enum: `due` | `completed`.

---

## Doctor workflows

### Dashboard alerts (`app/(doctor)/index.tsx`)

`buildDoctorAlerts()` constructs three severity tiers:
1. High-risk patients in caseload
2. Community alert count from ward
3. Active campaign count

### Record visit (`app/(doctor)/record-visit.tsx`)

Uses `PatientPicker` → `recordClinicalVisit()` in `lib/clinicalWorkflow.ts`:
1. Inserts `medical_records` row
2. Optionally creates `dashboard_tasks` for ASHA follow-up

### Appointments + telemedicine

**Status enum** (`AppointmentRecord`): `Scheduled` | `Active` | `Completed` | `Cancelled` | `No-Show`

**UI mapping** (`lib/formatters.ts` → `mapAppointmentStatusToUi`):
- `Active` → `in-progress`
- `Completed` → `completed`
- else → `upcoming`

**Join call** (`lib/appointmentWorkflow.ts`):

```typescript
startTelemedicineSession(appointment, doctorId)
  if status === 'Scheduled' → update to 'Active'
  logVideoCallSession({ status: 'Active', channelName })
  return { appointmentId, channelName, doctorId }

completeTelemedicineSession(appointmentId, doctorId, channelName)
  update to 'Completed'
  logVideoCallSession({ status: 'Completed' })
```

`video_calls` table provides audit trail independent of Agora SDK state.

---

## Patient workflows

### Book appointment (`app/(patient)/book-appointment.tsx`)

`createAppointment()` with `DateTimeField` for ISO timestamp.  
Status starts as `Scheduled`.

### Profile stats (`lib/profileStats.ts`)

`getPatientProfileStats(profileId)`:
- Upcoming = appointments where `status === 'Scheduled'`
- `hasVitals` from `patient_vitals`
- `recordCount` from `medical_records` via `getPatientIdForProfile`

---

## Profile system

`hooks/useUserProfile.ts`:

1. `getCurrentUser()` from Supabase Auth
2. `getUserProfile(user.id)` → `profiles` row (`name`, `email`, `phone`, `ward`, `level`, `lives_impacted`)
3. Role-specific stats from `profileStats.ts`
4. `saveProfile()` → `updateProfile()` in api
5. `logout()` → `signOutUser()` clears session

Screens: `app/(asha|doctor|patient)/profile.tsx` all use this hook.

---

## AI chat

`hooks/useAIChat.ts`:

1. Load history: `getChatHistory(userId)` from `ai_chat_history`
2. Send: `getMedGemmaResponse()` or edge proxy
3. Persist user + assistant messages via `saveChatMessage()`

System prompts in `lib/gemini.ts` bias toward primary-care / community health context.

---

## Notifications

`lib/notifications.ts`:
- Dynamic import of `expo-notifications` (skipped on web)
- `initializeNotifications()` requests OS permission once
- `notifyCareTeamDigest()` dedupes via AsyncStorage key `@vitaweave_last_alert_digest`
- `notifyAppointmentReminder()` for doctor’s next today appointment

Triggered from `lib/careNotifications.ts` on dashboard load - not a background FCM service yet.

---

## Auth hardening

`lib/authGuard.ts`:
- `getStoredUserId()` reads AsyncStorage
- Used by screens before Supabase calls

`lib/auth.ts` → `completeRoleLogin()`:
- Validates `profiles.role` matches selected login role
- Prevents doctor credential from entering ASHA routes

---

## Consent & privacy

`lib/consent.ts` - `hasAcceptedConsent()` / `setConsentAccepted()`  
`app/consent.tsx` - blocking screen until accepted  
`app/privacy-policy.tsx` - static policy view

`lib/phiSecurity.ts` - `redactPhi()`, `safeLog()` for Sentry/logger

---

## Error handling

- React errors → `components/ErrorBoundary.tsx`
- Production init → `lib/production.ts` validates env, starts Sentry, initializes notifications
- API errors → returned as `{ data, error }` from Supabase client; screens show `Alert` or `EmptyState`

---

## Testing boundaries

Default `npm test` runs unit tests with mocks (`tests/setup.js`).  
Live tests (`npm run test:live`) hit real Supabase/Gemini - require `.env` and are excluded from CI by default.

---

## File → responsibility quick map

| User action | Entry screen | Core lib |
|-------------|--------------|----------|
| Login | `app/login.tsx` | `auth.ts` |
| Triage patient | `(asha)/patients.tsx` | `api.updatePatientRisk` |
| Join video | `(doctor)/appointments.tsx` | `appointmentWorkflow.ts` |
| End video | `(doctor)/telemedicine.tsx` | `appointmentWorkflow.ts` |
| Record visit | `(doctor)/record-visit.tsx` | `clinicalWorkflow.ts` |
| Book slot | `(patient)/book-appointment.tsx` | `api.createAppointment` |
| Edit name/phone | `*/profile.tsx` | `useUserProfile` |
