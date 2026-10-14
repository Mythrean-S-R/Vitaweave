/**
 * Re-exports scoring + referral helpers used across the app.
 * Implementation: lib/urgencyScoring.ts (NEWS2 + maternal rules).
 */
import type { Patient } from '../app/_constants/data';
import {
  calculateUrgencyScore,
  visitSummaryFromPatient,
  type VitalReading,
  type VisitSummary,
  type UrgencyResult,
} from './urgencyScoring';

export type { VitalReading, VisitSummary, UrgencyResult };

export { calculateUrgencyScore, visitSummaryFromPatient, computeNews2Total, computeMaternalModifier } from './urgencyScoring';

/** @deprecated Use calculateUrgencyScore */
export function calculateRisk(patient: Patient): import('../app/_constants/data').RiskLevel {
  return calculateUrgencyScore(patient).riskLevel;
}

export function prioritizePatients(patients: Patient[]): Patient[] {
  return [...patients].sort((a, b) => {
    const scoreDiff = (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    const riskScore = { High: 3, Medium: 2, Low: 1 };
    const riskDiff = riskScore[b.riskLevel] - riskScore[a.riskLevel];
    if (riskDiff !== 0) return riskDiff;
    if (a.followUpUrgent && !b.followUpUrgent) return -1;
    if (!a.followUpUrgent && b.followUpUrgent) return 1;
    return a.name.localeCompare(b.name);
  });
}

type ServiceRecommendation = {
  id: string;
  title: string;
  reason: string;
  icon: string;
};

export function getRecommendedServices(patient: Patient): ServiceRecommendation[] {
  const text = (patient.condition + ' ' + patient.riskLevel).toLowerCase();
  const recommendations: ServiceRecommendation[] = [];
  const score = patient.urgencyScore ?? 0;

  if (score >= 80 || text.includes('critical') || text.includes('stroke')) {
    recommendations.push({
      id: 'emergency',
      title: 'Call Ambulance (108)',
      reason: 'Priority score indicates immediate transport.',
      icon: 'ambulance',
    });
  }

  if (text.includes('prenatal') || text.includes('pregnant') || text.includes('maternity')) {
    recommendations.push({
      id: 'refer_tele',
      title: 'Refer - telemedicine (OB)',
      reason: 'Prenatal case; schedule specialist consult.',
      icon: 'video',
    });
  }

  if (text.includes('diabetes') || text.includes('hypertension') || text.includes('bp')) {
    recommendations.push({
      id: 'ncd_clinic',
      title: 'NCD clinic referral',
      reason: 'Chronic condition monitoring required.',
      icon: 'activity',
    });
  }

  if (patient.age < 5 || text.includes('vaccin')) {
    recommendations.push({
      id: 'vaccine_camp',
      title: 'Vaccination tracker',
      reason: 'Check immunization schedule.',
      icon: 'syringe',
    });
  }

  return recommendations;
}

export function generateCaseSummary(patient: Patient): string {
  const score = patient.urgencyScore ?? 0;
  const band = score >= 80 ? 'emergency' : score >= 50 ? 'urgent' : 'routine';
  let summary = `${patient.name}, ${patient.age}y - ${patient.condition}. `;
  summary += `Priority score ${score} (${band}). `;
  if (patient.status === 'Critical') summary += 'Status critical. ';
  if (patient.followUpUrgent) summary += 'Follow-up due. ';
  return summary.trim();
}
