# VitaWeave - Pitch Guide

Use this document when presenting VitaWeave to investors, government health departments, NGOs, hospital networks, or technical partners.

---

## One-liner

**VitaWeave is a mobile-first community health operating system that gives ASHA workers AI-assisted tools, connects them to doctors via telemedicine, and turns ward-level data into actionable public-health signals.**

---

## The problem

India’s National Health Mission relies on **~1 million ASHA workers** to bridge villages and the formal health system. In practice:

1. **Data stays on paper** - triage, vaccinations, and referrals are hard to aggregate
2. **Doctors are scarce in rural blocks** - travel and queue management limit throughput
3. **Patients lack continuity** - records fragment across facilities
4. **Outbreaks are detected late** - symptom clusters and pharmacy trends are invisible at ward level
5. **AI is inaccessible** - frontline workers cannot safely use cloud LLMs without governance

---

## The solution

VitaWeave is a **single Expo app** with three role-specific experiences, backed by **Supabase**:

| Role | Primary jobs |
|------|----------------|
| **ASHA** | Register patients, triage risk, track vaccinations, respond to community alerts, use AI for task planning |
| **Doctor** | Review queue, run telemedicine visits, document encounters, run campaigns |
| **Patient** | Book appointments, view records and medications |

Everything syncs to a **PostgreSQL** database with **Row Level Security** so each user only sees authorized data.

---

## Why now

- **Smartphone penetration** in rural India crossed critical mass for field worker apps
- **Gemini-class models** enable safe, proxy-governed clinical assistance in local languages
- **Telemedicine norms** post-COVID are accepted by patients and regulators
- **Supabase / managed Postgres** lowers cost of HIPAA-aware architectures for pilots

---

## Differentiation

| Competitor pattern | VitaWeave approach |
|--------------------|-------------------|
| Hospital-only EMR | **Community-first** - ASHA is the primary data entry point |
| Generic telehealth apps | **Workflow-integrated** - appointment status drives video session lifecycle |
| Chatbot-only health apps | **Structured data** - vitals, meds, vaccinations, campaigns in SQL |
| Monolithic government portals | **Offline-tolerant mobile UX** with demo fallback for training |

---

## Traction narrative (pilot-ready)

What you can demo **today** with a configured Supabase project:

1. ASHA logs in → sees live task count and community risk
2. Updates patient triage → persists to database
3. Doctor sees high-risk patients on dashboard
4. Joins telemedicine call → appointment moves to Active, then Completed
5. AI assistant answers clinical questions (via Gemini proxy)
6. Push notification surfaces urgent tasks on device build

---

## Business model options

1. **B2G** - Per-ward or per-block license to state NHM / district health offices
2. **B2B** - Hospital chains sponsor telemedicine access for catchment villages
3. **NGO programs** - Maternal health, TB, NCD campaigns as modular packs
4. **SaaS + services** - Platform fee + implementation / training

---

## Market sizing (talking points)

- **ASHA workforce:** ~1M workers nationally
- **Rural PHC catchment:** 3,000–5,000 people per ASHA
- **Telemedicine TAM:** India digital health market projected >$10B by 2030 (cite updated reports in live pitches)

---

## Demo script (15 minutes)

### Setup (before meeting)
- Supabase seeded with 5–10 patients, 2 appointments today, 3 dashboard tasks
- Doctor + ASHA test accounts
- EAS dev build on Android device for video (optional: web for non-video demo)

### Act 1 - ASHA (5 min)
1. Open dashboard → point out community risk banner and task list
2. Open Patients → change one patient to High risk
3. Open Vaccinations → show due count
4. Open AI Assistant → ask “What tasks should I prioritize for high-risk pregnancies?”

### Act 2 - Doctor (5 min)
1. Dashboard → high-risk alert references the patient ASHA just flagged
2. Appointments → Join Telemedicine → show camera / connection state
3. End call → status becomes Completed
4. Record Visit → select patient, save note (mention follow-up task creation)

### Act 3 - Platform (5 min)
1. Show Supabase dashboard - RLS, real-time data
2. Explain edge proxy - API keys never ship in APK
3. Consent + privacy policy screens
4. Roadmap slide - wearables, scheme navigator (future)

---

## Objection handling

**“Is this HIPAA / DPDP compliant?”**  
We implement consent gates, RLS, PHI redaction utilities, and server-side AI proxy. Full compliance requires your legal review, BAA with Supabase, and organizational policies - architecture is designed to support that path. See [SECURITY_AND_COMPLIANCE.md](SECURITY_AND_COMPLIANCE.md).

**“What about offline?”**  
Local-first **WatermelonDB** (SQLite on device) with encrypted fields and SyncService push/pull to Supabase. Demo with an EAS development build (`npm run build:dev:android` then `npm run dev:client`).

**“Why not build on DHIS2 / existing government systems?”**  
VitaWeave can **export** to national systems via API integration (roadmap). The app optimizes for **ASHA UX** that DHIS2 was not designed for.

**“Why Supabase vs custom Django?”**  
Faster pilot, built-in auth/RLS, edge functions for secrets, lower DevOps burden for small teams. Scale-up path includes read replicas and self-hosted Postgres if required.

---

## Call to action

| Audience | Ask |
|----------|-----|
| Government | 90-day ward pilot, 10 ASHAs + 2 doctors, M&E metrics |
| NGO | Co-design maternal health module, shared IP on workflows |
| Investor | Seed to fund 3 state pilots + compliance certification |
| Technical partner | Agora / Gemini / Supabase co-marketing for rural health |

---

## Appendix - Key metrics to track in pilots

- Patients registered per ASHA per week
- Triage completion rate
- Telemedicine sessions completed vs scheduled
- Time from community alert to ASHA visit
- Vaccination due → completed conversion
- AI assistant queries per worker (governance review)
