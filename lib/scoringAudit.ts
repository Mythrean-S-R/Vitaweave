import { supabase } from './supabase';
import { getStoredUserId } from './authGuard';
import type { RiskLevel } from '../app/_constants/data';

export async function recordScoringAudit(input: {
  patientId: string;
  score: number;
  riskLevel: RiskLevel;
  factors?: string[];
  source?: 'app' | 'trigger' | 'manual' | 'triage';
}): Promise<void> {
  const computedBy = await getStoredUserId();
  const payload = {
    patient_id: input.patientId,
    score: input.score,
    risk_level: input.riskLevel,
    factors: input.factors ?? [],
    source: input.source ?? 'app',
    computed_by: computedBy ?? null,
  };

  const { error } = await supabase.from('scoring_audit').insert(payload);
  if (error) {
    console.warn('recordScoringAudit:', error.message);
  }
}
