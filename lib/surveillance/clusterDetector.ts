import type { SymptomReport, CommunityAlert } from '../../app/_constants/data';
import { writeLocalFirst } from '../sync/SyncService';
import { newLocalId, nowIso, listLocal } from '../repositories/base';

export type ClusterThreshold = {
  minCount: number;
  windowDays: number;
};

const DEFAULT_THRESHOLD: ClusterThreshold = { minCount: 5, windowDays: 7 };

/**
 * Rule engine: N similar symptom reports in same ward within T days → community alert.
 */
export function detectSymptomClusters(
  reports: { symptom: string; count: number; ward: string; created_at?: string }[],
  threshold: ClusterThreshold = DEFAULT_THRESHOLD
): { symptom: string; ward: string; total: number; severity: 'Medium' | 'High' | 'Critical' }[] {
  const cutoff = Date.now() - threshold.windowDays * 24 * 60 * 60 * 1000;
  const buckets = new Map<string, number>();

  for (const r of reports) {
    const created = r.created_at ? Date.parse(r.created_at) : Date.now();
    if (created < cutoff) continue;
    const key = `${(r.ward || 'unknown').toLowerCase()}::${r.symptom.toLowerCase()}`;
    buckets.set(key, (buckets.get(key) ?? 0) + (r.count || 1));
  }

  const clusters: {
    symptom: string;
    ward: string;
    total: number;
    severity: 'Medium' | 'High' | 'Critical';
  }[] = [];

  for (const [key, total] of buckets) {
    if (total < threshold.minCount) continue;
    const [ward, symptom] = key.split('::');
    const severity = total >= threshold.minCount * 3 ? 'Critical' : total >= threshold.minCount * 2 ? 'High' : 'Medium';
    clusters.push({ symptom, ward, total, severity });
  }

  return clusters;
}

export async function runOutbreakDetectionAndFlag(): Promise<number> {
  const rows = await listLocal('symptom_reports');
  const reports = rows.map((r) => ({
    symptom: String(r.symptom ?? ''),
    count: Number(r.count ?? 1),
    ward: String(r.ward ?? 'unknown'),
    created_at: String(r.created_at ?? r.updated_at ?? nowIso()),
  }));

  const clusters = detectSymptomClusters(reports);
  let created = 0;

  for (const c of clusters) {
    const title = `${c.symptom} cluster in ${c.ward}`;
    const existing = (await listLocal('community_alerts')).find(
      (a) => String(a.title) === title && !a.deleted_at
    );
    if (existing) {
      await writeLocalFirst('community_alerts', {
        ...existing,
        severity: c.severity,
        description: `${c.total} reports in the last 7 days. Possible outbreak - escalate to PHC.`,
        updated_at: nowIso(),
        source: 'surveillance',
      });
    } else {
      await writeLocalFirst('community_alerts', {
        id: newLocalId(),
        severity: c.severity,
        title,
        description: `${c.total} reports in the last 7 days. Possible outbreak - escalate to PHC.`,
        ward: c.ward,
        alert_date: nowIso().slice(0, 10),
        icon: 'alert',
        source: 'surveillance',
        created_at: nowIso(),
        updated_at: nowIso(),
      });
      created++;
    }
  }

  return created;
}
