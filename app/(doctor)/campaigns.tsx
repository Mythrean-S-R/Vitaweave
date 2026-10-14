import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Plus, Megaphone, MapPin, Users, Calendar, ChevronLeft } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCampaigns, createCampaign } from '../../lib/api';
import { formatCampaignDate } from '../../lib/formatters';
import type { CampaignRecord } from '../_constants/data';
import { getStoredUserId } from '../../lib/authGuard';
import { writeLocalFirst } from '../../lib/sync/SyncService';
import { newLocalId, nowIso } from '../../lib/repositories/base';
import { sendServerPush } from '../../lib/serverPush';
import { logAuditEvent } from '../../lib/auditLog';
import { withAudit } from '../../lib/withAudit';

export default function CampaignPlannerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ward, setWard] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCampaigns();
      setCampaigns(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCampaigns();
    }, [loadCampaigns])
  );

  const displayStatus = (status: string) => {
    if (status === 'Completed') return 'Completed';
    if (status === 'Active') return 'Active';
    if (status === 'Upcoming') return 'Upcoming';
    return 'Planning';
  };

  const statusStyle = (status: string) => {
    if (status === 'Completed') return styles.statusCompleted;
    if (status === 'Active') return styles.statusActive;
    return styles.statusUpcoming;
  };

  const statusTextStyle = (status: string) => {
    if (status === 'Completed') return styles.statusTextCompleted;
    if (status === 'Active') return styles.statusTextActive;
    return styles.statusTextUpcoming;
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Title required');
      return;
    }
    setSaving(true);
    const userId = await getStoredUserId();
    if (!userId) {
      Alert.alert('Not signed in');
      setSaving(false);
      return;
    }

    await withAudit(
      { action: 'create', resourceType: 'campaign', metadata: { title } },
      async () => {
        const id = newLocalId();
        await writeLocalFirst('campaigns', {
          id,
          title: title.trim(),
          description: description.trim() || null,
          ward: ward.trim() || null,
          status: 'Planning',
          created_by: userId,
          created_at: nowIso(),
          updated_at: nowIso(),
        });
        await createCampaign({
          title: title.trim(),
          description: description.trim() || undefined,
          createdBy: userId,
          ward: ward.trim() || undefined,
        });
      }
    );

    setSaving(false);
    setModalOpen(false);
    setTitle('');
    setDescription('');
    setWard('');
    await loadCampaigns();
  };

  const publishCampaign = async (camp: CampaignRecord) => {
    const userId = await getStoredUserId();
    await withAudit(
      { action: 'update', resourceType: 'campaign', resourceId: String(camp.id), metadata: { publish: true } },
      async () => {
        await writeLocalFirst('campaigns', {
          id: camp.id,
          title: camp.title,
          description: camp.description,
          status: 'Active',
          published_at: nowIso(),
          updated_at: nowIso(),
        });
        if (userId) {
          await sendServerPush({
            profileId: userId,
            title: 'Health campaign',
            body: camp.title,
            data: { type: 'campaign', campaignId: camp.id },
          }).catch(() => undefined);
        }
      }
    );
    await logAuditEvent({
      action: 'update',
      resourceType: 'campaign_publish',
      resourceId: String(camp.id),
    });
    Alert.alert('Published', 'Campaign is active and notification queued.');
    await loadCampaigns();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.title}>Campaigns</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Plus size={20} color="#fff" />
          <Text style={styles.addText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#0891b2" style={{ marginTop: 40 }} />
        ) : campaigns.length === 0 ? (
          <Text style={styles.emptyText}>No campaigns yet. Create one to push health awareness.</Text>
        ) : (
          campaigns.map((camp) => (
            <View key={camp.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <View style={styles.iconWrap}>
                    <Megaphone size={18} color="#0891b2" />
                  </View>
                  <Text style={styles.campTitle}>{camp.title}</Text>
                </View>
              </View>
              <View style={styles.badgeRow}>
                <View style={[styles.statusPill, statusStyle(camp.status)]}>
                  <Text style={[styles.statusText, statusTextStyle(camp.status)]}>
                    {displayStatus(camp.status)}
                  </Text>
                </View>
              </View>
              {camp.description ? <Text style={styles.desc}>{camp.description}</Text> : null}
              <View style={styles.metaRow}>
                <MapPin size={12} color="#94a3b8" />
                <Text style={styles.meta}>{camp.location || 'Ward campaign'}</Text>
                <Calendar size={12} color="#94a3b8" />
                <Text style={styles.meta}>{formatCampaignDate(camp.date ?? camp.campaignDate)}</Text>
                <Users size={12} color="#94a3b8" />
                <Text style={styles.meta}>{camp.targetCount ?? 0}</Text>
              </View>
              {camp.status !== 'Active' && camp.status !== 'Completed' ? (
                <TouchableOpacity style={styles.publishBtn} onPress={() => publishCampaign(camp)}>
                  <Text style={styles.publishText}>Publish & notify</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </View>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New campaign</Text>
            <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Description / health tip"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <TextInput style={styles.input} placeholder="Ward" value={ward} onChangeText={setWard} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Create</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#0f172a' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0891b2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addText: { fontFamily: 'Inter-SemiBold', color: '#fff', fontSize: 13 },
  content: { padding: 16, paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontFamily: 'Inter-Regular' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: { marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  campTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#0f172a', flex: 1 },
  badgeRow: { flexDirection: 'row', marginBottom: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusCompleted: { backgroundColor: '#d1fae5' },
  statusActive: { backgroundColor: '#ecfeff' },
  statusUpcoming: { backgroundColor: '#fef3c7' },
  statusText: { fontFamily: 'Inter-Medium', fontSize: 11 },
  statusTextCompleted: { color: '#059669' },
  statusTextActive: { color: '#0891b2' },
  statusTextUpcoming: { color: '#d97706' },
  desc: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#64748b', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  meta: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#94a3b8', marginRight: 8 },
  publishBtn: {
    marginTop: 10,
    backgroundColor: '#0f766e',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  publishText: { fontFamily: 'Inter-SemiBold', color: '#fff', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 18, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontFamily: 'Inter-Regular',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#0891b2', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
  saveText: { color: '#fff', fontFamily: 'Inter-SemiBold' },
  cancel: { textAlign: 'center', color: '#64748b', fontFamily: 'Inter-Medium', paddingVertical: 8 },
});
