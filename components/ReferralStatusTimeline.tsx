import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ReferralRecord } from '../app/_constants/data';
import { Fonts } from '../app/_constants/theme';

const STEPS: { key: ReferralRecord['status'] | 'created'; label: string }[] = [
  { key: 'created', label: 'Created' },
  { key: 'pending', label: 'Pending' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
];

function stepIndex(status: ReferralRecord['status']): number {
  if (status === 'declined') return 1;
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 1;
}

function formatWhen(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Visual status timeline for closed-loop referrals. */
export function ReferralStatusTimeline({ referral }: { referral: ReferralRecord }) {
  const active = stepIndex(referral.status);
  const declined = referral.status === 'declined';

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Referral pathway</Text>
      <Text style={styles.ladder}>
        {referral.referredToType.replace(/_/g, ' ').toUpperCase()}
        {referral.referredToName ? ` · ${referral.referredToName}` : ''}
      </Text>
      {STEPS.filter((s) => s.key !== 'created').map((step, i) => {
        const index = i + 1;
        const done = !declined && index <= active;
        const isCurrent = !declined && index === active;
        let when = '';
        if (step.key === 'pending') when = formatWhen(referral.createdAt);
        if (step.key === 'acknowledged') when = formatWhen(referral.acknowledgedAt);
        if (step.key === 'completed') when = formatWhen(referral.completedAt);
        return (
          <View key={step.key} style={styles.row}>
            <View style={[styles.dot, done && styles.dotDone, isCurrent && styles.dotCurrent, declined && index === 1 && styles.dotDeclined]} />
            <View style={styles.textCol}>
              <Text style={[styles.label, done && styles.labelDone]}>
                {step.label}
                {declined && step.key === 'pending' ? ' (declined)' : ''}
              </Text>
              {when ? <Text style={styles.when}>{when}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, marginBottom: 4 },
  title: { fontFamily: Fonts.semiBold, fontSize: 12, color: '#64748b', marginBottom: 4 },
  ladder: { fontFamily: Fonts.medium, fontSize: 11, color: '#0891b2', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e2e8f0',
    marginTop: 4,
    marginRight: 10,
  },
  dotDone: { backgroundColor: '#059669' },
  dotCurrent: { backgroundColor: '#0891b2', width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  dotDeclined: { backgroundColor: '#dc2626' },
  textCol: { flex: 1 },
  label: { fontFamily: Fonts.regular, fontSize: 13, color: '#94a3b8' },
  labelDone: { color: '#0f172a', fontFamily: Fonts.medium },
  when: { fontFamily: Fonts.regular, fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
