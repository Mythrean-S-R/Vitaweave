# Getting Started (Developers)

Detailed onboarding for engineers cloning VitaWeave for the first time.

---

## 1. Clone repository

```bash
git clone https://github.com/your-org/vitaweave.git
cd vitaweave
```

---

## 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

`--legacy-peer-deps` resolves React 19 / Jest peer conflicts in devDependencies.

---

## 3. Environment file

```bash
cp .env.example .env
```

Minimum for local development:

```env
# Google Cloud Firebase
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key

# Google Gemini API & Gemma Model (scanning & decision intelligence)
EXPO_PUBLIC_GEMINI_API_KEY=AIza...
EXPO_PUBLIC_GEMINI_MODEL=gemini-1.5-flash
EXPO_PUBLIC_USE_EDGE_PROXY=false

# Supabase Backend
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Agora Telemedicine RTC
EXPO_PUBLIC_AGORA_APP_ID=...

# App Configuration
EXPO_PUBLIC_DEV_MODE=true
```

| Flag | When |
|------|------|
| `EXPO_PUBLIC_DEV_MODE=true` | Show demo seed data when DB is empty |
| `EXPO_PUBLIC_USE_EDGE_PROXY=false` | Call Gemini directly from client (easier local dev) |
| `EXPO_PUBLIC_USE_EDGE_PROXY=true` | Match production; requires deployed edge function |

---

## 4. Supabase database

1. Create free Supabase project
2. SQL Editor → run `supabase/complete_schema.sql`
3. Authentication → create 3 users
4. Insert matching `profiles` rows (see [DEPLOYMENT.md](DEPLOYMENT.md))
5. Insert 2–3 `patients` with `asha_id` = ASHA user's UUID

---

## 5. Run app

```bash
npm run dev
```

- Press `a` for Android emulator
- Press `w` for web browser
- Scan QR with Expo Go (limited native features)

---

## 6. Login

Use the email/password from Supabase Auth. On login screen, select the role matching the user's `profiles.role`.

If dev mode is on and Supabase is unreachable, some screens may still show demo data.

---

## 7. Verify features

| Step | Screen | Expected |
|------|--------|----------|
| 1 | ASHA → Patients | List from DB or demo |
| 2 | ASHA → change risk | Persists after refresh |
| 3 | Doctor → Appointments | Shows seeded appointments |
| 4 | Doctor → Join call | Navigates to telemedicine |
| 5 | Profile (any role) | Shows name from `profiles` |

---

## 8. Development commands

```bash
npm run dev          # Start Expo
npm run typecheck    # TypeScript
npm test             # Unit tests
npm run lint         # ESLint
npm run build:web    # Static web export
```

---

## 9. Project conventions

### API access
- All Supabase calls go through `lib/api.ts`
- Screens use hooks or inline `useCallback` loaders - no direct `supabase` imports in `app/`

### Types
- Shared UI types: `app/constants/data.ts`
- DB types inferred from api return shapes

### Paths
- `@/` alias maps to project root (see `tsconfig.json`)

### Adding a screen
1. Create file under correct route group
2. Register in group `_layout.tsx` if tabbed
3. Add api functions if new data needed
4. Update RLS in schema if new table

---

## 10. Native development (telemedicine)

Expo Go does **not** include Agora native module.

```bash
npm i -g eas-cli
eas build --profile development --platform android
```

Install resulting APK on device; run `npx expo start --dev-client`.

---

## 11. Edge functions (optional for day 1)

```bash
supabase functions serve gemini-proxy --env-file .env.local
```

Set `EXPO_PUBLIC_USE_EDGE_PROXY=true` when ready.

---

## 12. Common errors

**`Invalid API key`** - Wrong Supabase anon key or URL typo.

**`JWT expired`** - Sign out and sign in; check device clock.

**`permission denied for table patients`** - RLS: user not assigned as `asha_id` or missing profile row.

**`Cannot find module expo-notifications`** - Run `npm install expo-notifications --legacy-peer-deps`.

**Metro cache issues** - `npx expo start -c`

---

## 13. Next reading

- [ARCHITECTURE.md](ARCHITECTURE.md) - system design
- [INTERNAL_LOGIC.md](INTERNAL_LOGIC.md) - business rules in code
- [DATA_MODEL.md](DATA_MODEL.md) - tables and RLS
- [DEPLOYMENT.md](DEPLOYMENT.md) - staging and production
