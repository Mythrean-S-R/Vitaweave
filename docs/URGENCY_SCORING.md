# VitaWeave Urgency Engine & Decision Support

VitaWeave's **AI Urgency Engine** transforms frontline healthcare by analyzing multi-dimensional patient data—vitals, visit history, gestational context, and physiological risk factors—to identify high-priority cases and clearly explain *why* they require immediate attention.

---

## 1. Engine Objectives

Frontline workers often manage 1,000+ households. Without automated triage intelligence, high-risk cases look identical to routine visits until complications arise. The Urgency Engine:
1. **Determines Who Needs Attention First**: Dynamically scores caseloads from 0 to 100.
2. **Explains What Action is Required**: Generates human-understandable clinical rationale tags.
3. **Ensures Closed-Loop Follow-Through**: Feeds directly into daily task prioritization and doctor consultation queues.

---

## 2. Clinical Foundations & Physiology Rules

The core physiological scoring is grounded in validated medical frameworks implemented in `lib/urgencyScoring.ts`:

| Framework / Source | Role in VitaWeave |
|-------------------|-------------------|
| **NEWS2 (RCP 2017)** (`NEWS2-master/`) | Royal College of Physicians National Early Warning Score: respiration rate, oxygen saturation (SpO₂), systolic BP, heart rate, temperature, consciousness. |
| **Maternal Risk Protocols** (`maternal-health-risk-main/`) | Feature sets from Kaggle/UCI research: maternal age, gestational hypertension, blood sugar anomalies, severe anemia, and edema. |
| **Gemma / MedGemma Reasoner** | Clinical natural-language synthesis generating plain-language reasoning for frontline workers (English, Hindi, Tamil). |

### Scoring Pipeline

1. **NEWS2 Baseline**: Calculates physiological decompensation points (0–20).
2. **Maternal & Vulnerability Multipliers**:
   - Elevated systolic/diastolic blood pressure during pregnancy.
   - Signs of pre-eclampsia (headaches, vision changes, sudden swelling).
   - High blood glucose or unmonitored gestational diabetes.
3. **Visit Recency & Care Gap Modifiers**:
   - Missed antenatal care (ANC) milestones.
   - Overdue child immunization doses (UIP schedule).
   - Unresolved prior referrals.
4. **Normalized Score (0–100) & Urgency Band**:
   - **High Priority (Score ≥ 70)**: Immediate home visit or emergency PHC referral within 24h.
   - **Medium Priority (Score 40–69)**: Action within 48–72h; routine escalation.
   - **Routine (Score < 40)**: Scheduled health monitoring.

---

## 3. Explainability & Human-in-the-Loop Decision Support

VitaWeave eliminates opaque "black-box" predictions. Alongside numerical scores, the engine outputs **Explainable Rationale Tags**:
- `[Severe Diastolic Elevation: 104 mmHg - Pre-eclampsia Risk]`
- `[NEWS2 Decompensation: Tachycardia + Hypoxia (SpO2 91%)]`
- `[Missed ANC Checkup: Week 34 with Reported Pedal Edema]`

This transparent breakdown gives ASHA workers and PHC doctors full clinical confidence to validate and override recommendations at any time.

---

## 4. Architectural Integration

- **Triggered Upon Data Entry**: Recalculated whenever vitals are captured via manual entry, IoT vitals devices, or **Google Gemini Vision OCR scanning**.
- **Automated Task Scheduling**: `supabase/functions/daily-task-generation` generates prioritized daily visit routes for ASHA workers every morning.
- **Doctor Outpatient Queue**: Automatically reorders clinical waiting rooms by patient urgency rather than first-come-first-served arrival.
- **District Health Demand Signals**: High-urgency clusters aggregate into ward-level outbreak warnings and inter-PHC resource redistribution models.
