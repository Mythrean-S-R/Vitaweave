import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { getMedGemmaResponse, getMedGemmaVisionResponse } from '../../lib/gemini';
import { redactPhi } from '../../lib/phiSecurity';
import { writeLocalFirst } from '../../lib/sync/SyncService';
import { newLocalId, nowIso } from '../../lib/repositories/base';
import { getStoredUserId } from '../../lib/authGuard';
import { logAuditEvent } from '../../lib/auditLog';

export default function SummarizeReportScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [scrubPhi, setScrubPhi] = useState(true);
  const [imageNote, setImageNote] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const name = asset.fileName ?? 'lab-report.jpg';
    const mimeType = asset.mimeType ?? 'image/jpeg';
    setOcrLoading(true);
    setImageNote(`Extracting text from ${name}…`);
    try {
      const base64 = asset.base64;
      if (!base64) {
        throw new Error('Could not read image data - try another image');
      }
      const extracted = await getMedGemmaVisionResponse(
        'Extract all readable clinical text from this lab report or medical document image. Preserve lab values, units, and headings. Output plain text only - no markdown fences. If unreadable, say so briefly.',
        base64,
        mimeType,
        `Source filename: ${name}`
      );
      const cleaned = scrubPhi ? redactPhi(extracted) : extracted;
      setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${cleaned}` : cleaned));
      setImageNote(`OCR from ${name} (assistive - verify before clinical use)`);
    } catch (e) {
      setImageNote(`Attached ${name} - OCR failed; paste text manually`);
      Alert.alert('OCR failed', e instanceof Error ? e.message : 'Could not extract text');
    } finally {
      setOcrLoading(false);
    }
  };

  const summarize = async () => {
    if (!text.trim()) {
      Alert.alert('Paste report text', 'Enter clinical report text or attach an image for OCR.');
      return;
    }
    setLoading(true);
    try {
      const payload = scrubPhi ? redactPhi(text) : text;
      const prompt = `Summarize the following clinical document/report for a rural India doctor. Include: key findings, red flags, suggested next steps. Be concise. Outputs are assistive only - verify with a specialist.\n\n${payload}`;
      const result = await getMedGemmaResponse(prompt, imageNote || undefined);
      setSummary(result);
      const userId = await getStoredUserId();
      await writeLocalFirst('dashboard_tasks', {
        id: newLocalId(),
        title: 'AI report summary saved',
        subtitle: result.slice(0, 120),
        priority: 'routine',
        icon: 'sparkles',
        assigned_to: userId,
        created_at: nowIso(),
        updated_at: nowIso(),
      }).catch(() => undefined);
      await logAuditEvent({
        action: 'create',
        resourceType: 'report_summary',
        metadata: { scrubPhi, length: text.length },
      });
    } catch (e) {
      Alert.alert('Summarize failed', e instanceof Error ? e.message : 'AI unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#0891b2" />
        </TouchableOpacity>
        <Text style={styles.title}>Summarize Report</Text>
      </View>

      <TouchableOpacity style={styles.attachBtn} onPress={pickImage} disabled={ocrLoading}>
        {ocrLoading ? (
          <ActivityIndicator color="#0891b2" />
        ) : (
          <Text style={styles.attachText}>Attach image (AI OCR)</Text>
        )}
      </TouchableOpacity>
      {imageNote ? <Text style={styles.hint}>{imageNote}</Text> : null}
      <Text style={styles.disclaimer}>
        AI OCR and summaries are assistive only. Verify findings before clinical decisions.
      </Text>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Scrub PHI before sending to AI</Text>
        <Switch value={scrubPhi} onValueChange={setScrubPhi} />
      </View>

      <TextInput
        style={[styles.input, styles.multiline]}
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Paste lab report / discharge summary text…"
      />

      <TouchableOpacity style={styles.btn} onPress={summarize} disabled={loading || ocrLoading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Sparkles size={16} color="#fff" />
            <Text style={styles.btnText}>Summarize with MedGemma</Text>
          </>
        )}
      </TouchableOpacity>

      {summary ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Summary</Text>
          <Text style={styles.resultBody}>{summary}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 40, marginBottom: 16 },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#0f172a' },
  attachBtn: {
    backgroundColor: '#ecfeff',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  attachText: { fontFamily: 'Inter-SemiBold', color: '#0891b2' },
  hint: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b', marginBottom: 8 },
  disclaimer: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748b' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontFamily: 'Inter-Regular',
  },
  multiline: { minHeight: 140, textAlignVertical: 'top' },
  btn: {
    marginTop: 14,
    backgroundColor: '#0891b2',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: { fontFamily: 'Inter-SemiBold', color: '#fff' },
  result: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, marginBottom: 8 },
  resultBody: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#334155', lineHeight: 20 },
});
