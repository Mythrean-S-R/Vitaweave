# Deployment Guide

Step-by-step instructions to deploy VitaWeave from development to production.

---

## Prerequisites checklist

- [ ] Supabase account and project
- [ ] Google AI Studio API key (Gemini)
- [ ] Agora account (App ID + App Certificate)
- [ ] Sentry project (optional but recommended)
- [ ] Expo account + EAS CLI (`npm i -g eas-cli`)
- [ ] GitHub repo with Actions enabled
- [ ] Vercel account (optional, for web)

---

## 1. Supabase setup

### Create project

1. [supabase.com](https://supabase.com) → New project
2. Note **Project URL** and **anon public key**
3. Never expose **service_role** key in the mobile app

### Apply schema

1. SQL Editor → New query
2. Paste entire contents of `supabase/complete_schema.sql`
3. Run - verify tables in Table Editor
4. Apply incremental migrations in order (`002` … `008_rls_hardening.sql`)

Or with CLI linked to the project: `supabase db push`

### Create auth users

Authentication → Users → Add user (email/password) for each test role.

### Insert profiles

```sql
INSERT INTO profiles (id, email, name, role, ward, phone)
VALUES
  ('<auth-uuid-asha>', 'asha@test.com', 'Sunita Sharma', 'asha', '12', '+91...'),
  ('<auth-uuid-doctor>', 'doctor@test.com', 'Dr. Rajesh Sharma', 'doctor', '12', '+91...'),
  ('<auth-uuid-patient>', 'patient@test.com', 'Lakshmi Bai', 'patient', '12', '+91...'),
  ('<auth-uuid-admin>', 'supervisor@test.com', 'District Supervisor', 'admin', '12', '+91...');
```

### Seed sample patients (optional)

Link patients to ASHA via `asha_id = '<auth-uuid-asha>'`.

---

## 2. Edge functions

Install Supabase CLI and link project:

```bash
npm i -g supabase
supabase login
supabase link --project-ref your-project-ref
```

Deploy with **gateway JWT verification on** (preferred). Each user-facing function also validates the caller inside the handler:

```bash
supabase functions deploy gemini-proxy
supabase functions deploy agora-token
supabase functions deploy send-push
supabase functions deploy data-rights
```

`daily-task-generation` is **cron-only**. Deploy it separately and invoke only with `CRON_SECRET` or the service-role key:

```bash
supabase functions deploy daily-task-generation
```

If a mobile client cannot send JWTs through the gateway for a specific function, you may use `--no-verify-jwt` for that function **only** - in-function `getUser()` / role checks remain mandatory. Never deploy `daily-task-generation` without `CRON_SECRET` (or service-role) auth.

Set secrets (Dashboard → Edge Functions → Secrets):

| Secret | Value |
|--------|-------|
| `GEMINI_API_KEY` | Google AI key |
| `GEMINI_MODEL` | `gemini-1.5-flash` (or current) |
| `AGORA_APP_ID` | Agora App ID |
| `AGORA_APP_CERTIFICATE` | Agora primary certificate |
| `CRON_SECRET` | Long random string for scheduled task generation |

### Cron invoke example

```bash
curl -X POST "$SUPABASE_URL/functions/v1/daily-task-generation" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

Or schedule via Supabase cron / `pg_net` with the same header. Do **not** call this URL from the mobile app.

Client env:

```env
EXPO_PUBLIC_USE_EDGE_PROXY=true
EXPO_PUBLIC_AGORA_APP_ID=your-app-id
EXPO_PUBLIC_DEV_MODE=false
EXPO_PUBLIC_ABDM_MODE=live
# EXPO_PUBLIC_ABDM_BASE_URL=...   # required for live ABHA; omit → ABDM disabled in production
```

---

## 3. Client environment

Copy `.env.example` → `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_GEMINI_API_KEY=...        # dev only if proxy off
EXPO_PUBLIC_AGORA_APP_ID=...
EXPO_PUBLIC_SENTRY_DSN=...
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_USE_EDGE_PROXY=true
EXPO_PUBLIC_DEV_MODE=false
NODE_ENV=production
```

For EAS builds, set these in `eas.json` env or Expo dashboard secrets.

---

## 4. Local verification

```bash
npm install --legacy-peer-deps
npm run typecheck
npm test
npm run lint
npm run dev
```

Test login for each role. Verify:
- ASHA patients load from DB
- Doctor appointments show urgency-sorted queue
- Profile screens show real names
- Supervisor reaches `/(admin)` via **District supervisor login**
- Sync status dot appears after offline writes (toggle airplane mode briefly)
- Patient profile shows ABHA card (placeholder until `patients.abha_id` is set)

---

## 5. EAS mobile builds

Offline WatermelonDB (SQLite) and Agora telemedicine require a **custom development client** - Expo Go will not load these native modules.

### Configure

1. Replace `REPLACE_WITH_EAS_PROJECT_ID` in `app.json` → `extra.eas.projectId`
2. Update `@sentry/react-native/expo` org/project in `app.json`
3. Review `eas.json` profiles: `development`, `preview`, `production`

### Fill before store submit (required credentials)

Do **not** invent IDs. Leave placeholders until you have real account values:

| Placeholder | Where | How to obtain |
|-------------|-------|---------------|
| `REPLACE_WITH_EAS_PROJECT_ID` | `app.json` → `extra.eas.projectId` | `eas init` / Expo dashboard project |
| `REPLACE_WITH_APPLE_ID` | `eas.json` → `submit.production.ios.appleId` | Apple ID email used for App Store Connect |
| `REPLACE_WITH_ASC_APP_ID` | `eas.json` → `submit.production.ios.ascAppId` | App Store Connect → App → App Information → Apple ID (numeric) |
| `REPLACE_WITH_TEAM_ID` | `eas.json` → `submit.production.ios.appleTeamId` | Apple Developer → Membership → Team ID |

**iOS submit is blocked** until all three Apple fields are real values. Android can submit after EAS project ID is set. Production/preview EAS env must keep `EXPO_PUBLIC_DEV_MODE=false` and must not ship mock ABDM OTP.

### Development client (local device)

```bash
eas login
eas build:configure
npm run build:dev:android   # or: npm run build:dev:ios
# Install the build on device/emulator, then:
npm run dev:client
```

### Preview / store builds

```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

Telemedicine + WatermelonDB require a native build - **not Expo Go**.

### Store submission

```bash
eas submit --platform android
eas submit --platform ios
```

Update `ios.buildNumber` and `android.versionCode` per release.

---

## 6. Web deployment (Vercel)

```bash
npm run build:web
```

Or connect GitHub repo to Vercel - `vercel.json` configures output.

Set environment variables in Vercel dashboard (same `EXPO_PUBLIC_*` keys).

**Note:** Telemedicine and push notifications are limited on web.

---

## 7. GitHub CI/CD

Workflow: `.github/workflows/ci-cd.yml`

Required secrets for full pipeline (if extended):

| Secret | Purpose |
|--------|---------|
| `EXPO_TOKEN` | EAS automated builds |
| `SUPABASE_URL` | Integration tests |
| `SUPABASE_ANON_KEY` | Integration tests |

Current CI runs lint + typecheck + unit tests without secrets.

---

## 8. Sentry

1. Create React Native project in Sentry
2. Set `EXPO_PUBLIC_SENTRY_DSN`
3. Run Sentry wizard if symbols needed: `npx @sentry/wizard@latest -i reactNative`

---

## 9. Post-deploy checks

| Check | How |
|-------|-----|
| Auth login | Each role (asha, doctor, patient, admin) reaches correct home |
| RLS | Patient A cannot read Patient B records |
| Gemini proxy | Network tab shows edge URL, not Google direct |
| Agora token | Token fetched from edge before join |
| Appointments | Status transitions on video start/end |
| Notifications | Permission prompt on device build; `push_tokens` row after login |
| Server push | `send-push` invoked from care notification flow |
| Audit logs | Supervisor dashboard lists recent `audit_log` / `scoring_audit` rows |
| Sentry | Trigger test error in staging |

---

## 10. Rollback

- **Mobile:** Promote previous EAS build in store consoles
- **Database:** Restore Supabase point-in-time backup
- **Edge functions:** `supabase functions deploy` previous git tag

---

## Environment matrix

| Variable | Dev | Staging | Prod |
|----------|-----|---------|------|
| `EXPO_PUBLIC_DEV_MODE` | true | false | false |
| `EXPO_PUBLIC_USE_EDGE_PROXY` | optional | true | true |
| `NODE_ENV` | development | staging | production |
| Sentry sample rate | 0.5 | 0.2 | 0.1 |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Empty patients list | Check `asha_id` on patients matches logged-in user |
| RLS permission denied | Re-run policies section of schema; verify `auth.uid()` |
| Gemini 401 | Edge secret `GEMINI_API_KEY` set; proxy enabled |
| Agora join fails | Certificate in edge secret; dev build not Expo Go |
| Notifications silent | Physical device; permission granted; not web |
| Typecheck fails in CI | `npm run typecheck` locally before push |

---

See also: [README.md](../README.md) · [SECURITY_AND_COMPLIANCE.md](SECURITY_AND_COMPLIANCE.md)
