import type { CommunityAlert, RiskLevel } from '../app/_constants/data';

const RISK_RANK: Record<string, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

function normalizeRisk(severity: string): RiskLevel {
  if (severity === 'Critical' || severity === 'High') return 'High';
  if (severity === 'Medium') return 'Medium';
  return 'Low';
}

export function computeCommunityRiskLevel(alerts: CommunityAlert[]): RiskLevel {
  if (!alerts.length) return 'Low';

  let highest: RiskLevel = 'Low';
  for (const alert of alerts) {
    const level = normalizeRisk(alert.severity);
    if (RISK_RANK[level] > RISK_RANK[highest]) {
      highest = level;
    }
  }
  return highest;
}

export function summarizeCommunitySignals(alerts: CommunityAlert[]) {
  const highCount = alerts.filter(
    (a) => a.severity === 'High' || a.severity === 'Critical'
  ).length;
  const activeCount = alerts.length;

  return {
    riskLevel: computeCommunityRiskLevel(alerts),
    highCount,
    activeCount,
    summary:
      activeCount === 0
        ? 'No active community alerts'
        : `${activeCount} active alert${activeCount === 1 ? '' : 's'}${highCount ? ` · ${highCount} high priority` : ''}`,
  };
}
