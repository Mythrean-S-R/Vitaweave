import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getReferralsForDoctor, updateReferralStatus } from '../../lib/api';
import type { ReferralRecord } from '../_constants/data';
import { ListSkeleton } from '../../components/ListSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ReferralStatusTimeline } from '../../components/ReferralStatusTimeline';
import { withAudit } from '../../lib/withAudit';

const STATUS_FILTERS = ['all', 'pending', 'active', 'done'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  pending: 'Pending',
  active: 'Active',
  done: 'Done',
};

const FILTER_OPTIONS = STATUS_FILTERS.map((value) => ({ value, label: FILTER_LABELS[value] }));

function matchesFilter(r: ReferralRecord, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending') return r.status === 'pending';
  if (filter === 'active') return r.status === 'acknowledged' || r.status === 'in_progress';
  return r.status === 'completed' || r.status === 'declined';
}

function urgencyColor(urgency: ReferralRecord['urgency']): string {
  if (urgency === 'emergency') return '#dc2626';
  if (urgency === 'urgent') return '#d97706';
  return '#059669';
}

export default function DoctorReferralsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [completeModal, setCompleteModal] = useState<ReferralRecord | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const load = useCallback(async () => {
    const rows = await getReferralsForDoctor();
    setReferrals(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const acknowledge = async (id: string) => {
    const { error } = await withAudit(
      { action: 'update', resourceType: 'referral', resourceId: id, metadata: { status: 'acknowledged' } },
      () => updateReferralStatus(id, 'acknowledged')
    );
    if (error) Alert.alert('Error', 'Could not update referral.');
    else await load();
  };

  const complete = async () => {
    if (!completeModal) return;
    if (!outcomeNotes.trim()) {
      Alert.alert('Outcome required', 'Add brief outcome notes before closing the referral.');
      return;
    }
    const { error } = await withAudit(
      {
        action: 'update',
        resourceType: 'referral',
        resourceId: completeModal.id,
        metadata: { status: 'completed' },
      },
      () => updateReferralStatus(completeModal.id, 'completed', outcomeNotes.trim())
    );
    if (error) Alert.alert('Error', 'Could not complete referral.');
    else {
      setCompleteModal(null);
      setOutcomeNotes('');
      await load();
    }
  };

  const filtered = referrals.filter((r) => matchesFilter(r, filter));

  if (loading) {
    return (
      <View style={styles.wrap}>
        <ListSkeleton rows={5} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.filterRow}>
        <SegmentedControl
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <EmptyState title="No referrals" message="Incoming referrals from ASHA workers will appear here." />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.patientName}>{item.patientName ?? 'Patient'}</Text>
              <View style={[styles.urgencyPill, { backgroundColor: urgencyColor(item.urgency) + '22' }]}>
                <Text style={[styles.urgencyText, { color: urgencyColor(item.urgency) }]}>{item.urgency}</Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {item.referredToType.toUpperCase()}
              {item.referredToName ? ` · ${item.referredToName}` : ''}
            </Text>
            <Text style={styles.reason}>{item.reason}</Text>
            <ReferralStatusTimeline referral={item} />

            {item.status === 'pending' && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => acknowledge(item.id)}>
                <Text style={styles.actionText}>Acknowledge</Text>
              </TouchableOpacity>
            )}
            {(item.status === 'acknowledged' || item.status === 'in_progress') && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.completeBtn]}
                onPress={() => {
                  setCompleteModal(item);
                  setOutcomeNotes('');
                }}
              >
                <Text style={styles.actionText}>Mark completed</Text>
              </TouchableOpacity>
            )}
            {item.status === 'completed' && item.outcomeNotes ? (
              <Text style={styles.outcome}>Outcome: {item.outcomeNotes}</Text>
            ) : null}
          </View>
        )}
      />

      <Modal visible={!!completeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Complete referral</Text>
            <Text style={styles.modalSub}>{completeModal?.patientName}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Outcome notes (required)"
              placeholderTextColor="#94a3b8"
              value={outcomeNotes}
              onChangeText={setOutcomeNotes}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCompleteModal(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={complete}>
                <Text style={styles.confirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f8fafc' },
  filterRow: { padding: 16, paddingBottom: 8 },
  list: { padding: 16, paddingTop: 0 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  patientName: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#0f172a' },
  urgencyPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  urgencyText: { fontFamily: 'Inter-Medium', fontSize: 11, textTransform: 'uppercase' },
  meta: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b', marginBottom: 6 },
  reason: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#334155', marginBottom: 8 },
  status: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8' },
  actionBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
  },
  completeBtn: { backgroundColor: '#d1fae5' },
  actionText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#0891b2' },
  outcome: { marginTop: 8, fontFamily: 'Inter-Regular', fontSize: 12, color: '#475569' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', padding: 24 },
  modalSheet: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontFamily: 'Inter-SemiBold', fontSize: 17, color: '#0f172a' },
  modalSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 16, alignItems: 'center' },
  cancelText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b' },
  confirmBtn: { backgroundColor: '#0891b2', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  confirmText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
});
