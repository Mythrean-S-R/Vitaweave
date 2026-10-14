# Technology Stack - Rationale

Why VitaWeave is built the way it is, and what trade-offs were accepted.

---

## Mobile: Expo 54 + React Native

**Chosen for:**
- Single TypeScript codebase targeting Android, iOS, and web
- Expo Router for file-based navigation matching product’s role-separated UX
- EAS Build for store-ready binaries without maintaining native projects day-one
- Large ecosystem (camera, notifications, fonts) aligned with healthcare UX needs

**Trade-offs:**
- Native modules (Agora RTC) require **custom dev client**, not Expo Go
- Web build lacks full telemedicine parity
- Bundle size larger than native Kotlin/Swift apps

**Alternatives considered:**
- Flutter - strong UI but smaller Supabase/RN hiring pool in India
- Native dual codebase - higher cost for pilot-stage team

---

## Routing: Expo Router v6

**Chosen for:**
- Route groups `(asha)`, `(doctor)`, `(patient)` map 1:1 to product roles
- Deep linking for telemedicine (`appointmentId` params)
- Typed routes experiment enabled in `app.json`

---

## Cloud Database & Backend: Google Cloud Firebase & Supabase

### Google Cloud Firebase / Firestore

**Chosen for:**
- **Real-Time Data Synchronization**: Firestore's document-model reactive listeners broadcast urgent patient status updates, high-risk flags, and bed/medicine inventory levels instantly across frontline ASHA workers and district supervisors.
- **Offline Cache & Resilience**: Firebase SDK provides robust local disk persistence and automated stream reconnects in rural zones with intermittent 2G/3G connectivity.
- **Scalability & Residency**: Hosted on Google Cloud infrastructure in India (`asia-south1` Mumbai) guaranteeing local data sovereignty in full compliance with the Digital Personal Data Protection (DPDP) Act 2023.

### Supabase (PostgreSQL + RLS + Edge Functions)

**Chosen for:**
- **Relational Integrity**: Multi-table relationships connecting patients, maternal histories, UIP vaccination schedules, referrals, and telemedicine audit logs.
- **Row Level Security (RLS)**: Enforces strict data-access boundaries directly in PostgreSQL, ensuring workers only access their assigned rural catchment areas.
- **Edge Compute Functions (Deno)**: Secure server-side isolation for Gemini API keys, Agora RTC credentials, and automated daily task generation jobs.

---

## AI & Multimodal Intelligence: Google Gemini & Google Gemma

### 1. Google Gemini API (Multimodal Scanning & Vision OCR)

**Role:** High-accuracy digitization and clinical document understanding.
- **Multimodal Scanning via Gemini API Keys**: Uses `gemini-1.5-flash` / Gemini Vision API to convert physical paper records, handwritten doctor prescriptions, maternal ANC/PNC cards, and lab diagnostic reports into structured FHIR-like JSON objects.
- **Zero-Exposure Security**: Calls are proxied through edge functions so raw Gemini API keys never ship inside client application bundles.
- **Task Prioritization**: Generates AI task suggestions (`generateAITaskSuggestions()`) prioritizing urgent home visits.

### 2. Google Gemma / MedGemma (Frontline Clinical Decision Support)

**Role:** Clinical-grade medical decision support and explainable triage.
- **Medical Specialization**: Built on Google's open Gemma model family adapted for healthcare (`MedGemma`), providing evidence-based triage support, differential diagnostic recommendations, and clinical explainability.
- **Multilingual Frontline Assistance**: Natural vernacular comprehension across Hindi, Tamil, and English, allowing ASHA workers to query in their native languages.
- **Explainable Decision Support**: Rather than presenting opaque risk numbers, MedGemma articulates *why* a patient is flagged as high-risk (e.g., combination of gestational week, elevated diastolic pressure, and pedal edema) empowering the frontline worker with actionable clarity.

---

## Video: Agora

**Chosen for:**
- Proven RTC latency in emerging markets
- Token-based channel security
- `react-native-agora` for native builds

**Pattern:**
- Client holds `EXPO_PUBLIC_AGORA_APP_ID` (public)
- `agora-token` edge function signs tokens with **App Certificate** (secret)

**Limitation in repo:** Remote video rendering (`RtcSurfaceView`) needs EAS build validation; local `CameraView` preview works in development.

---

## State & storage

| Concern | Solution |
|---------|----------|
| Server state | Supabase queries in `lib/api.ts`; refetch on `useFocusEffect` |
| Session | Supabase Auth session + AsyncStorage mirrors (`user_id`, `user_role`) |
| Consent / notification dedupe | AsyncStorage keys |
| Global UI state | React `useState` / `useCallback` - no Redux (YAGNI for pilot) |

---

## UI & design

- **lucide-react-native** - consistent iconography
- **Inter font** via `@expo-google-fonts/inter`
- **react-native-reanimated** - dashboard animations
- Role-specific color accents (ASHA teal, doctor cyan, patient green)

---

## Observability: Sentry

**Chosen for:**
- React Native crash reporting
- Expo plugin in `app.json`
- Initialized in `ProductionInitializer` with environment-based sample rates

`lib/phiSecurity.ts` scrubs names/phones before breadcrumbs.

---

## CI/CD

**GitHub Actions** (`.github/workflows/ci-cd.yml`):
- `npm run lint`
- `npm run typecheck`
- `npm test` (unit only)

**EAS** (`eas.json`): development, preview, production profiles  
**Vercel** (`vercel.json`): static web export for marketing / demo

---

## Voice input

`@react-native-voice/voice` in `lib/voiceRecognition.ts` - experimental hands-free data entry for ASHA. Package is deprecated; roadmap includes migration to Expo Speech or platform APIs.

---

## Web research: Firecrawl

`EXPO_PUBLIC_FIRECRAWL_API_KEY` - optional scraping for health scheme content (limited use in current screens). Kept for future Benefits Navigator module.

---

## Security-related libraries

| Library | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Auth + PostgREST client |
| `react-native-url-polyfill` | Supabase compatibility on RN |
| `@react-native-async-storage/async-storage` | Local persistence |

---

## Version policy

- Pin Expo SDK packages to compatible versions (`expo doctor`)
- TypeScript strict checking via `npm run typecheck`
- `npm install --legacy-peer-deps` may be required due to Jest/React 19 peer conflicts

---

## When to reconsider the stack

| Trigger | Action |
|---------|--------|
| >100k MAU | Read replicas, connection pooling (Supavisor), CDN for assets |
| Government mandate for on-prem | Export schema; self-host Postgres + Keycloak |
| Full offline-first | **Done** - WatermelonDB + SyncService (`lib/db`, `lib/sync`) |
| FHIR required | Add HAPI FHIR sidecar or Google Healthcare API bridge |
