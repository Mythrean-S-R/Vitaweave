# VitaWeave - Credentials for Public Release

Checklist of every credential, key, and account ID needed to ship VitaWeave publicly (stores + production backend).  
**Do not put real secret values in this file.** Store secrets in Supabase Edge Secrets, EAS secrets, GitHub Actions secrets, or a local `.env` (gitignored).

Related docs: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · [docs/SECURITY_AND_COMPLIANCE.md](docs/SECURITY_AND_COMPLIANCE.md) · [.env.example](.env.example)

---

## Quick status

| Area | Required for public release? | Notes |
|------|------------------------------|-------|
| Google Cloud Firebase / Firestore | **Yes** | Cloud document database, real-time sync listeners, multi-region residency |
| Supabase (URL, anon, service role, edge secrets) | **Yes** | Relational data + auth + RLS |
| Google Gemini (`GEMINI_API_KEY` / Gemini API) | **Yes** | Clinical AI decision support & multimodal camera OCR scanning |
| Google Gemma / MedGemma | **Yes** | Frontline medical triage model architecture & local reasoning |
| Agora (App ID + certificate) | **Yes** | Telemedicine video consultations |
| Expo / EAS project ID | **Yes** | Native Android/iOS builds |
| Apple submit IDs | **Yes for iOS** | App Store submit |
| Google Play / Android | **Yes for Android** | Play Console + signing via EAS |
| Sentry DSN | Strongly recommended | Crash monitoring & telemetry |
| `CRON_SECRET` | **Yes** | Daily task generation & demand forecast triggers |
| ABDM / NHA | Optional at launch | Without it, ABHA stays disabled in production |
| Firecrawl | Optional | Auxiliary scraping |
| Vercel | Optional | Web landing deploy |
| GitHub `EXPO_TOKEN` / CI secrets | If using CI deploy | `.github/workflows/ci-cd.yml` |

---

## 1. Google Cloud Firebase / Firestore (required)

### Values

| Name | Where it goes | Public? |
|------|---------------|---------|
| `FIREBASE_PROJECT_ID` → `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Client `.env` / EAS env / GitHub secrets | Yes (Project ID) |
| `FIREBASE_API_KEY` → `EXPO_PUBLIC_FIREBASE_API_KEY` | Client `.env` / EAS env | Yes (Client web API key protected by Firebase App Check & Security Rules) |
| `FIREBASE_AUTH_DOMAIN` | Client `.env` / EAS env | Yes |
| `FIREBASE_STORAGE_BUCKET` | Client `.env` / EAS env | Yes |
| Google Cloud Service Account JSON | Backend / Cloud Functions / Secrets only | **Secret** (Never ship in client binary) |

### How to obtain

1. Open [Google Cloud Console](https://console.cloud.google.com/) or [Firebase Console](https://console.firebase.google.com/).
2. Create or select your Google Cloud project (e.g., `vitaweave-rural-health`).
3. Under **Build → Firestore Database**, create a Firestore instance in region **asia-south1 (Mumbai)** for Indian data residency and DPDP compliance.
4. Under **Project Settings → General → Your apps**, register an Android/Web app and copy the config credentials.
5. In production, configure Firestore Security Rules with role-based attributes and enable Firebase App Check to prevent unauthorized API requests.

---

## 2. Supabase (relational backend & edge proxy)

### Values

| Name | Where it goes | Public? |
|------|---------------|---------|
| Project URL → `EXPO_PUBLIC_SUPABASE_URL` | Client `.env` / EAS env / GitHub secrets | Yes (URL) |
| Anon (public) key → `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client / EAS / GitHub | Yes (protected by RLS) |
| Region → `EXPO_PUBLIC_SUPABASE_REGION` | Client (use `ap-south-1` for India) | Yes |
| Service role key | Supabase only - **never** in the mobile app | **Secret** |
| Project ref (for CLI `supabase link`) | Local / CI | Semi-public |

Supabase Edge also injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into functions automatically.

### How to obtain

1. Create an account at [https://supabase.com](https://supabase.com).
2. **New project** - prefer region **Mumbai (`ap-south-1`)** for India data residency.
3. Open **Project Settings → API**:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → keep only for admin/cron; never ship in the APK/IPA
4. Apply schema + migrations (`complete_schema.sql`, then `002` … `008`) - see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
5. Install CLI, then: `supabase login` → `supabase link --project-ref <ref>` → deploy functions.

---

## 3. Google Gemini API & Gemma Model (required)

### Values

| Name | Where it goes | Public? |
|------|---------------|---------|
| `GEMINI_API_KEY` | Edge Secrets / Backend / Local `.env` | **Secret** (All AI and Multimodal Scanning calls use Gemini API keys exclusively) |
| `GEMINI_MODEL` (e.g. `gemini-1.5-flash`) | Edge secret / Env | Config |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Only if edge proxy is off (development only) | Avoid in production client bundles |
| `EXPO_PUBLIC_USE_EDGE_PROXY=true` | Client / EAS | Flag |
| `EXPO_PUBLIC_GEMMA_MODEL` (e.g. `medgemma-2b` / `gemma-2-2b-it`) | Client / Edge | Config |

### Use cases in VitaWeave

- **Multimodal Scanning & OCR**: Google Gemini Vision (`gemini-1.5-flash` / Multimodal API) parses camera photos of physical prescriptions, handwritten maternal ANC cards, immunization cards, and diagnostic reports into structured FHIR-like JSON entities.
- **AI Decision Support**: Frontline triage recommendations, risk factor extraction, and daily task prioritization.
- **Gemma / MedGemma Model Architecture**: The open-weights Gemma family provides on-device and edge-optimized medical intelligence, clinical explainability, and multi-language support (Hindi, Tamil, English) designed for rural bandwidth constraints.

### How to obtain

1. Open [Google AI Studio](https://aistudio.google.com/apikey) or [Google Cloud Vertex AI](https://cloud.google.com/vertex-ai).
2. Sign in with your Google account.
3. Click **Create API Key** → copy the key.
4. In Supabase Dashboard → **Edge Functions → Secrets** (or Cloud Function environment variables), set:
   - `GEMINI_API_KEY=<your key>`
   - `GEMINI_MODEL=gemini-1.5-flash`
5. Deploy `gemini-proxy` so the mobile client never embeds the raw Gemini key in production.

---

## 4. Agora telemedicine (required)

### Values

| Name | Where it goes | Public? |
|------|---------------|---------|
| `EXPO_PUBLIC_AGORA_APP_ID` | Client / EAS | Yes (App ID is public by design) |
| `AGORA_APP_ID` | Edge secret (same value) | Config |
| `AGORA_APP_CERTIFICATE` | Edge secret only | **Secret** |

### How to obtain

1. Sign up at [https://www.agora.io](https://www.agora.io).
2. Console → **Create project** (secure mode / App Certificate enabled).
3. Copy **App ID** → `EXPO_PUBLIC_AGORA_APP_ID` and edge `AGORA_APP_ID`.
4. Open the project → **Primary Certificate** → copy → edge `AGORA_APP_CERTIFICATE`.
5. Deploy the `agora-token` edge function so clients mint tokens server-side.

---

## 5. Cron / daily tasks (required)

### Values

| Name | Where it goes | Public? |
|------|---------------|---------|
| `CRON_SECRET` | Supabase Edge Secrets | **Secret** |

Used as `Authorization: Bearer <CRON_SECRET>` when invoking `daily-task-generation`. You may also authorize with the Supabase **service role** JWT; prefer a dedicated cron secret.

### How to obtain

Generate a long random string locally, for example:

```bash
# PowerShell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])

# or OpenSSL
openssl rand -hex 32
```

Then set it in Supabase → Edge Functions → Secrets as `CRON_SECRET`.  
Schedule invokes with that header (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

---

## 6. Expo Application Services / EAS (required for store builds)

### Values

| Name | Where it goes | Public? |
|------|---------------|---------|
| Expo account | `eas login` | Account |
| EAS project ID → `app.json` → `extra.eas.projectId` | Replaces `REPLACE_WITH_EAS_PROJECT_ID` | Project UUID |
| `EXPO_TOKEN` | GitHub Actions secret (CI builds) | **Secret** |

### How to obtain

1. Create an account at [https://expo.dev](https://expo.dev).
2. Install CLI: `npm i -g eas-cli`
3. In the repo root:
   ```bash
   eas login
   eas init
   ```
   Or link an existing project - copy the **Project ID** from the Expo dashboard into `app.json` → `extra.eas.projectId`.
4. For CI: Expo dashboard → **Access tokens** → create token → GitHub repo → **Settings → Secrets** → `EXPO_TOKEN`.

Set production EAS env (already sketched in `eas.json`):

- `EXPO_PUBLIC_DEV_MODE=false`
- `EXPO_PUBLIC_USE_EDGE_PROXY=true`
- `EXPO_PUBLIC_ABDM_MODE=live`
- Plus all `EXPO_PUBLIC_*` Supabase / Agora / Sentry values for the production project

---

## 7. Apple App Store (required for iOS submit)

### Values

| Name | Where it goes | Public? |
|------|---------------|---------|
| `appleId` | `eas.json` → `submit.production.ios.appleId` | Account email |
| `ascAppId` | `eas.json` → `submit.production.ios.ascAppId` | Numeric App Store Connect ID |
| `appleTeamId` | `eas.json` → `submit.production.ios.appleTeamId` | Team ID |
| Apple Developer Program membership | Apple | Paid enrollment |
| Distribution certificates / provisioning | Managed by EAS Submit / credentials | **Secret** (EAS can manage) |

Bundle ID in this repo: `com.vitaweave.app`.

### How to obtain

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) (~paid annual membership).
2. **Team ID**: [developer.apple.com/account](https://developer.apple.com/account) → Membership → **Team ID** → replace `REPLACE_WITH_TEAM_ID`.
3. **Apple ID**: the email you use for App Store Connect → replace `REPLACE_WITH_APPLE_ID`.
4. Create the app in [App Store Connect](https://appstoreconnect.apple.com):
   - My Apps → **+** → New App
   - Bundle ID must match `com.vitaweave.app`
5. **ASC App ID** (numeric): App Store Connect → your app → **App Information** → **Apple ID** → replace `REPLACE_WITH_ASC_APP_ID`.
6. First iOS build: `eas build --platform ios --profile production`, then `eas submit --platform ios` (EAS can create/manage certs if you allow it).

---

## 8. Google Play (required for Android store)

### Values

| Name | Where it goes | Public? |
|------|---------------|---------|
| Google Play Console developer account | Play Console | Paid one-time registration (typical) |
| Package name | Already `com.vitaweave.app` in `app.json` | Public |
| Play App signing / upload key | EAS credentials | **Secret** |
| Service account JSON (optional, for `eas submit`) | EAS / CI | **Secret** |

### How to obtain

1. Register at [Google Play Console](https://play.google.com/console).
2. Create an application with package `com.vitaweave.app`.
3. Build: `eas build --platform android --profile production` (AAB).
4. Submit via Play Console UI, or configure [EAS Submit for Android](https://docs.expo.dev/submit/android/) with a Google Cloud **service account** JSON that has Play Developer API access.
5. Complete store listing, content rating, and Data safety form (maps to privacy nutrition labels).

---

## 9. Sentry (strongly recommended)

### Values

| Name | Where it goes | Public? |
|------|---------------|---------|
| `EXPO_PUBLIC_SENTRY_DSN` | Client / EAS | Public client DSN (scrub PHI in `beforeSend`) |
| Org / project | `app.json` plugin (`vitaweave` / `vitaweave-mobile`) | Config |
| Auth token (for source maps, optional) | EAS / CI `SENTRY_AUTH_TOKEN` | **Secret** |

### How to obtain

1. Sign up at [https://sentry.io](https://sentry.io).
2. Create a **React Native** project.
3. Project Settings → **Client Keys (DSN)** → copy → `EXPO_PUBLIC_SENTRY_DSN`.
4. Align org/project slug in `app.json` `@sentry/react-native/expo` plugin with your Sentry org/project.
5. Optional: create an auth token for uploading source maps during EAS builds.

---

## 10. Push notifications (recommended)

### Values

| Name | Where it goes | Public? |
|------|---------------|---------|
| Expo push (default) | Via Expo / `send-push` edge function | Uses Expo Push API |
| `EXPO_ACCESS_TOKEN` (optional) | Edge secret | **Secret** - higher rate limits |
| FCM / APNs | Usually managed by EAS + Expo notifications | Platform secrets |

### How to obtain

1. Expo Push works with EAS projects out of the box for many setups.
2. Optional Expo access token: [expo.dev](https://expo.dev) → Account → Access tokens → set edge secret `EXPO_ACCESS_TOKEN`.
3. For production reliability, configure FCM (Android) and APNs (iOS) per [Expo push credentials docs](https://docs.expo.dev/push-notifications/push-notifications-setup/).

---

## 11. ABDM / NHA (optional - live ABHA)

Without these, production builds keep ABHA **disabled** (no mock OTP). Core app can still ship.

### Values

| Name | Where it goes | Public? |
|------|---------------|---------|
| `EXPO_PUBLIC_ABDM_MODE=live` | EAS production (already set) | Flag |
| `EXPO_PUBLIC_ABDM_BASE_URL` | Client / EAS | Gateway URL |
| NHA sandbox / production client credentials | Your ABDM gateway or edge secrets (as you implement) | **Secret** |

### How to obtain

1. Register for ABDM / NHA sandbox access via official NHA / ABDM partner channels ([ABDM](https://abdm.gov.in/) / NHA developer onboarding).
2. Complete org KYC / partnership steps as required.
3. Receive sandbox base URL and credentials for HIP/HIU flows.
4. Point `EXPO_PUBLIC_ABDM_BASE_URL` at your gateway that implements the adapter routes used by `HttpAbdmClient` (`/v1/abha/link`, `/verify-otp`, `/prescription`, HIU consent/records).
5. Legal review of consent artefacts before enabling for real patients.

---

## 12. Hosted privacy policy URL (required for store listings)

### Values

| Name | Where it goes | Public? |
|------|---------------|---------|
| Public HTTPS URL | `app.json` → `extra.privacyPolicyUrl` (currently `https://vitaweave.app/privacy`) | Public |

In-app policy at `app/privacy-policy.tsx` is the canonical text until the URL is live.

### How to obtain

1. Host the same content on your domain (Vercel/Netlify/static site), or export the in-app policy to a web page.
2. Ensure HTTPS and a stable path.
3. Update `extra.privacyPolicyUrl` if the final URL differs.
4. Use that URL in App Store / Play Console privacy fields.

---

## 13. Optional: Firecrawl

| Name | Where | Required? |
|------|-------|-----------|
| `EXPO_PUBLIC_FIRECRAWL_API_KEY` | Client / CI | No - leave empty if unused |

Obtain at [https://firecrawl.dev](https://firecrawl.dev) → Dashboard → API key.

---

## 14. Optional: Vercel (web)

| Name | Where | Required? |
|------|-------|-----------|
| `VERCEL_TOKEN` | GitHub secret | Web CI only |
| `VERCEL_ORG_ID` | GitHub secret | Web CI only |
| `VERCEL_PROJECT_ID` | GitHub secret | Web CI only |

Obtain via [vercel.com](https://vercel.com) → account tokens + project settings. Also set the same `EXPO_PUBLIC_*` vars in the Vercel project env.

---

## 15. GitHub Actions secrets (if using CI/CD)

From `.github/workflows/ci-cd.yml`, set these in **GitHub → Repo → Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|--------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Builds / tests |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Builds / tests |
| `EXPO_PUBLIC_GEMINI_API_KEY` | CI (prefer unused when proxy-only) |
| `EXPO_PUBLIC_FIRECRAWL_API_KEY` | Optional |
| `EXPO_PUBLIC_AGORA_APP_ID` | Builds |
| `EXPO_PUBLIC_SENTRY_DSN` | Builds |
| `EXPO_TOKEN` | EAS builds from CI |
| `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | Web deploy |

---

## Production client env template

Copy to `.env` for local prod-like runs, or set equivalent keys in **EAS → Project → Secrets / env** for `production` and `preview` profiles:

```env
NODE_ENV=production
EXPO_PUBLIC_DEV_MODE=false
EXPO_PUBLIC_USE_EDGE_PROXY=true
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_SUPABASE_REGION=ap-south-1
EXPO_PUBLIC_AGORA_APP_ID=your_agora_app_id
EXPO_PUBLIC_SENTRY_DSN=https://...@....ingest.sentry.io/...
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ABDM_MODE=live
# EXPO_PUBLIC_ABDM_BASE_URL=https://your-abdm-gateway.example
# EXPO_PUBLIC_GEMINI_API_KEY=   # omit when edge proxy is on
# EXPO_PUBLIC_FIRECRAWL_API_KEY=
```

### Supabase Edge Secrets (Dashboard)

```text
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
CRON_SECRET=
# EXPO_ACCESS_TOKEN=   # optional
```

### Placeholders to replace in repo files

| Placeholder | File |
|-------------|------|
| `REPLACE_WITH_EAS_PROJECT_ID` | `app.json` |
| `REPLACE_WITH_APPLE_ID` | `eas.json` |
| `REPLACE_WITH_ASC_APP_ID` | `eas.json` |
| `REPLACE_WITH_TEAM_ID` | `eas.json` |

---

## Security rules

1. Never commit `.env`, service role keys, Agora certificate, `CRON_SECRET`, or Apple/Google signing material.
2. Prefer edge secrets for Gemini and Agora certificate; keep `EXPO_PUBLIC_USE_EDGE_PROXY=true` in production.
3. Rotate any key that may have been shared in chat, screenshots, or a public repo.
4. Use separate Supabase projects (and keys) for development vs production.
5. After filling credentials, complete the **Owner: organization** checklist in [docs/SECURITY_AND_COMPLIANCE.md](docs/SECURITY_AND_COMPLIANCE.md) (migrations applied, privacy URL live, pen test, DPA, store labels, Agora device QA).

---

## Minimal path to first public build

1. Google Cloud Firebase / Firestore project configured (region `asia-south1`)
2. Supabase project + migrations `002`–`008` + edge secrets + function deploys  
3. Gemini API key set for multimodal scanning OCR and clinical decision support  
4. Agora RTC credentials set for telemedicine  
5. `CRON_SECRET` set  
6. Expo account + EAS project ID in `app.json`  
7. Production `EXPO_PUBLIC_*` in EAS  
8. Android: Play Console app + `eas build` / submit  
9. iOS: Apple Developer + fill three `eas.json` fields + `eas build` / submit  
10. Host privacy policy URL  
11. Sentry DSN in production builds  

ABDM/NHA can wait until after the first public release if ABHA linking is not required at launch.
