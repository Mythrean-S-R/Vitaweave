/**
 * VitaWeave design tokens - single source for UI.
 * Re-exports app theme; add role accents only (no second palette).
 */
export { Colors, Fonts, Spacing, Radius, Shadow, getRiskColors } from '../app/_constants/theme';
export type { RiskLevel } from '../app/_constants/theme';

export const RoleAccent = {
  asha: '#0891b2',
  doctor: '#0891b2',
  patient: '#059669',
  admin: '#475569',
} as const;

export const UrgencyBand = {
  emergency: { min: 80, label: 'Emergency', color: '#dc2626' },
  urgent: { min: 50, label: 'Urgent', color: '#d97706' },
  routine: { min: 0, label: 'Routine', color: '#64748b' },
} as const;

export function urgencyBandLabel(score: number): string {
  if (score >= 80) return UrgencyBand.emergency.label;
  if (score >= 50) return UrgencyBand.urgent.label;
  return UrgencyBand.routine.label;
}
