/**
 * Evidence-based priority scoring for VitaWeave.
 *
 * Sources (repos in project root):
 * 1. NEWS2-master - Royal College of Physicians NEWS2 2017 thresholds (chart.js)
 * 2. maternal-health-risk-main - Kaggle maternal dataset feature set + clinical ranges (predict.py validation)
 * 3. Maternal-Health-Risk-Prediction-main - UCI feature selection research (informative weights only; no ML runtime)
 *
 * This is a transparent rule engine. UI copy must say "priority score", not "AI model".
 */
import type { Patient, RiskLevel } from '../app/_constants/data';

export type VitalReading = {
  respiratoryRate?: number;
  heartRate?: number;
  bloodPressure?: string;
  bloodSugar?: number;
  /** Celsius in app; maternal dataset uses Fahrenheit - convert before maternal rules */
  temperature?: number;
  spo2?: number;
  onSupplementalOxygen?: boolean;
  consciousness?: 'alert' | 'confused' | 'voice' | 'pain' | 'unresponsive';
  recordedAt?: string;
};

export type VisitSummary = {
  daysSinceLastVisit?: number;
  followUpUrgent?: boolean;
};

export type UrgencyResult = {
  score: number;
  band: 'emergency' | 'urgent' | 'routine';
  riskLevel: RiskLevel;
  factors: string[];
  news2Total: number;
  maternalModifier: number;
};

type Band = { min: number; max: number; score: number };

function inBand(value: number, bands: Band[]): number {
  for (const b of bands) {
    if (value >= b.min && value <= b.max) return b.score;
  }
  return 0;
}

/** NEWS2 respiration rate - RCP 2017 (NEWS2-master/chart.js) */
function scoreRespiratoryRate(rr?: number): { points: number; factor?: string } {
  if (rr == null) return { points: 0 };
  const s = inBand(rr, [
    { min: 25, max: 200, score: 3 },
    { min: 21, max: 24, score: 2 },
    { min: 18, max: 20, score: 0 },
    { min: 15, max: 17, score: 0 },
    { min: 12, max: 14, score: 0 },
    { min: 9, max: 11, score: 1 },
    { min: 0, max: 8, score: 3 },
  ]);
  return s ? { points: s, factor: `Resp rate ${rr}/min (NEWS2 +${s})` } : { points: 0 };
}

/** NEWS2 SpO2 scale 1 */
function scoreSpO2Scale1(spo2?: number): { points: number; factor?: string } {
  if (spo2 == null) return { points: 0 };
  const s = inBand(spo2, [
    { min: 96, max: 100, score: 0 },
    { min: 94, max: 95, score: 1 },
    { min: 92, max: 93, score: 2 },
    { min: 0, max: 91, score: 3 },
  ]);
  return s ? { points: s, factor: `SpO2 ${spo2}% (NEWS2 +${s})` } : { points: 0 };
}

/** NEWS2 systolic BP only */
function scoreSystolicBp(sys?: number | null): { points: number; factor?: string } {
  if (sys == null) return { points: 0 };
  const s = inBand(sys, [
    { min: 220, max: 500, score: 3 },
    { min: 201, max: 219, score: 0 },
    { min: 181, max: 200, score: 0 },
    { min: 161, max: 180, score: 0 },
    { min: 141, max: 160, score: 0 },
    { min: 121, max: 140, score: 0 },
    { min: 111, max: 120, score: 0 },
    { min: 101, max: 110, score: 1 },
    { min: 91, max: 100, score: 2 },
    { min: 81, max: 90, score: 3 },
    { min: 71, max: 80, score: 3 },
    { min: 61, max: 70, score: 3 },
    { min: 51, max: 60, score: 3 },
    { min: 0, max: 50, score: 3 },
  ]);
  return s ? { points: s, factor: `Systolic BP ${sys} (NEWS2 +${s})` } : { points: 0 };
}

/** NEWS2 pulse */
function scorePulse(hr?: number): { points: number; factor?: string } {
  if (hr == null) return { points: 0 };
  const s = inBand(hr, [
    { min: 131, max: 500, score: 3 },
    { min: 121, max: 130, score: 2 },
    { min: 111, max: 120, score: 2 },
    { min: 101, max: 110, score: 1 },
    { min: 91, max: 100, score: 1 },
    { min: 81, max: 90, score: 0 },
    { min: 71, max: 80, score: 0 },
    { min: 61, max: 70, score: 0 },
    { min: 51, max: 60, score: 0 },
    { min: 41, max: 50, score: 1 },
    { min: 31, max: 40, score: 3 },
    { min: 0, max: 30, score: 3 },
  ]);
  return s ? { points: s, factor: `Pulse ${hr} (NEWS2 +${s})` } : { points: 0 };
}

/** NEWS2 temperature (°C) */
function scoreTemperatureC(temp?: number): { points: number; factor?: string } {
  if (temp == null) return { points: 0 };
  const s = inBand(temp, [
    { min: 39.1, max: 50, score: 2 },
    { min: 38.1, max: 39.0, score: 1 },
    { min: 37.1, max: 38.0, score: 0 },
    { min: 36.1, max: 37.0, score: 0 },
    { min: 35.1, max: 36.0, score: 1 },
    { min: 0, max: 35.0, score: 3 },
  ]);
  return s ? { points: s, factor: `Temp ${temp}°C (NEWS2 +${s})` } : { points: 0 };
}

function scoreConsciousness(c?: VitalReading['consciousness']): { points: number; factor?: string } {
  if (!c || c === 'alert') return { points: 0 };
  return { points: 3, factor: 'Altered consciousness (NEWS2 +3)' };
}

function parseSystolicBp(bp?: string): number | null {
  if (!bp) return null;
  const m = bp.match(/^(\d{2,3})/);
  return m ? Number(m[1]) : null;
}

function parseDiastolicBp(bp?: string): number | null {
  if (!bp) return null;
  const m = bp.match(/\/(\d{2,3})/);
  return m ? Number(m[1]) : null;
}

/**
 * Compute raw NEWS2 aggregate (0–20+) from vitals.
 * Supplemental O2 adds +2 per NEWS2 spec.
 */
export function computeNews2Total(vitals: VitalReading): number {
  const parts = [
    scoreRespiratoryRate(vitals.respiratoryRate),
    scoreSpO2Scale1(vitals.spo2),
    scoreSystolicBp(parseSystolicBp(vitals.bloodPressure)),
    scorePulse(vitals.heartRate),
    scoreConsciousness(vitals.consciousness),
    scoreTemperatureC(vitals.temperature),
  ];
  let total = parts.reduce((sum, p) => sum + p.points, 0);
  if (vitals.onSupplementalOxygen) total += 2;
  return total;
}

function isMaternalCase(patient: Patient, hasActivePregnancy?: boolean): boolean {
  if (hasActivePregnancy) return true;
  const t = patient.condition.toLowerCase();
  return t.includes('pregnan') || t.includes('prenatal') || t.includes('matern') || t.includes('anc') || t.includes('pnc');
}

/**
 * Maternal risk modifier - rule thresholds from maternal-health-risk-main/predict.py validation
 * and high-risk rows in data/data.csv (BS mmol/L, BP mmHg, HR bpm, age 13–50).
 * BS in app vitals is mg/dL; dataset BS is mmol/L - convert: mmol = mg/dL / 18.
 */
export function computeMaternalModifier(
  patient: Patient,
  vitals: VitalReading,
  hasActivePregnancy?: boolean
): { points: number; factors: string[] } {
  if (!isMaternalCase(patient, hasActivePregnancy)) return { points: 0, factors: [] };

  const factors: string[] = [];
  if (hasActivePregnancy) {
    factors.push('Active pregnancy on ANC/PNC register');
  }
  let points = hasActivePregnancy ? 5 : 0;
  const sys = parseSystolicBp(vitals.bloodPressure);
  const dia = parseDiastolicBp(vitals.bloodPressure);
  const hr = vitals.heartRate;
  const bsMmol = vitals.bloodSugar != null ? vitals.bloodSugar / 18 : null;
  const tempF =
    vitals.temperature != null ? (vitals.temperature * 9) / 5 + 32 : null;

  if (patient.age < 13 || patient.age > 50) {
    points += 8;
    factors.push('Maternal age outside 13–50 range');
  }
  if (sys != null && (sys >= 140 || sys <= 90)) {
    points += sys >= 160 ? 12 : 8;
    factors.push(`Maternal systolic BP ${sys}`);
  }
  if (dia != null && sys != null && sys <= dia) {
    points += 10;
    factors.push('Systolic ≤ diastolic');
  }
  if (bsMmol != null && (bsMmol >= 11 || bsMmol <= 4)) {
    points += bsMmol >= 15 ? 12 : 8;
    factors.push(`Blood glucose ${bsMmol.toFixed(1)} mmol/L`);
  }
  if (hr != null && (hr >= 100 || hr < 50)) {
    points += hr >= 110 ? 8 : 5;
    factors.push(`Heart rate ${hr}`);
  }
  if (tempF != null && (tempF >= 100.4 || tempF <= 95)) {
    points += 6;
    factors.push(`Body temp ${tempF.toFixed(1)}°F`);
  }

  return { points: Math.min(points, 30), factors };
}

function news2ToScalePoints(news2: number, anyParameterScore3: boolean): number {
  if (news2 >= 7) return 55 + Math.min(news2 - 7, 5) * 5;
  if (news2 >= 5) return 40 + (news2 - 5) * 5;
  if (news2 >= 3 && anyParameterScore3) return 35;
  if (news2 >= 1) return 15 + news2 * 3;
  return news2 * 5;
}

function scoreContext(patient: Patient, visit?: VisitSummary): { points: number; factors: string[] } {
  const factors: string[] = [];
  let points = 0;
  if (patient.status === 'Critical') {
    points += 15;
    factors.push('Status: Critical');
  }
  if (patient.followUpUrgent || visit?.followUpUrgent) {
    points += 10;
    factors.push('Urgent follow-up');
  }
  if (visit?.daysSinceLastVisit != null && visit.daysSinceLastVisit > 30) {
    points += 5;
    factors.push(`Last visit ${visit.daysSinceLastVisit}d ago`);
  }
  return { points: Math.min(points, 20), factors };
}

export function calculateUrgencyScore(
  patient: Patient,
  vitalsHistory: VitalReading[] = [],
  visitHistory?: VisitSummary,
  options?: { hasActivePregnancy?: boolean }
): UrgencyResult {
  const factors: string[] = [];
  const latest = vitalsHistory[0] ?? {};

  const news2 = computeNews2Total(latest);
  const newsParts = [
    scoreRespiratoryRate(latest.respiratoryRate),
    scoreSpO2Scale1(latest.spo2),
    scoreSystolicBp(parseSystolicBp(latest.bloodPressure)),
    scorePulse(latest.heartRate),
    scoreConsciousness(latest.consciousness),
    scoreTemperatureC(latest.temperature),
  ];
  newsParts.forEach((p) => {
    if (p.factor) factors.push(p.factor);
  });
  const anyThree = newsParts.some((p) => p.points >= 3);

  const maternal = computeMaternalModifier(patient, latest, options?.hasActivePregnancy);
  factors.push(...maternal.factors);

  const context = scoreContext(patient, visitHistory);
  factors.push(...context.factors);

  let score =
    news2ToScalePoints(news2, anyThree) + maternal.points + context.points;
  score = Math.min(Math.round(score), 100);

  let band: UrgencyResult['band'] = 'routine';
  if (score >= 80) band = 'emergency';
  else if (score >= 50) band = 'urgent';

  const riskLevel: RiskLevel =
    band === 'emergency' ? 'High' : band === 'urgent' ? 'Medium' : 'Low';

  return { score, band, riskLevel, factors, news2Total: news2, maternalModifier: maternal.points };
}

export function visitSummaryFromPatient(patient: Patient): VisitSummary {
  let days = 30;
  try {
    const last = new Date(patient.lastVisit);
    if (!Number.isNaN(last.getTime())) {
      days = Math.floor(Math.abs(Date.now() - last.getTime()) / (1000 * 3600 * 24));
    }
  } catch {
    /* keep default */
  }
  return { followUpUrgent: patient.followUpUrgent, daysSinceLastVisit: days };
}
