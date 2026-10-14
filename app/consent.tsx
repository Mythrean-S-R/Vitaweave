import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
// @ts-ignore
import { ShieldCheck, AlertTriangle, FileText, Users } from 'lucide-react-native';
import {
  acceptConsent,
  MEDICAL_DISCLAIMER,
  PRIVACY_SUMMARY,
  PARENTAL_CONSENT_SUMMARY,
} from '../lib/consent';
import { Analytics } from '../lib/analytics';

export default function ConsentScreen() {
  const router = useRouter();
  const [medical, setMedical] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [dataProcessing, setDataProcessing] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('');
  const [guardianAck, setGuardianAck] = useState(false);

  const guardianOk =
    !isMinor ||
    (guardianAck && guardianName.trim().length > 0 && guardianRelationship.trim().length > 0);
  const canContinue = medical && privacy && dataProcessing && guardianOk;

  const handleAccept = async () => {
    try {
      await acceptConsent(
        isMinor
          ? {
              isMinor: true,
              guardianName: guardianName.trim(),
              guardianRelationship: guardianRelationship.trim(),
              guardianAcknowledged: guardianAck,
            }
          : { isMinor: false }
      );
      Analytics.track({ name: 'consent_accepted' });
      router.replace('/login');
    } catch (e) {
      Alert.alert('Consent incomplete', e instanceof Error ? e.message : 'Could not save consent');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <ShieldCheck size={40} color="#0891b2" />
        <Text style={styles.title}>Before You Continue</Text>
        <Text style={styles.subtitle}>
          VitaWeave handles sensitive health information. Please review and accept the following to use the app.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <AlertTriangle size={18} color="#d97706" />
          <Text style={styles.cardTitle}>Medical Disclaimer</Text>
        </View>
        <Text style={styles.cardBody}>{MEDICAL_DISCLAIMER}</Text>
        <TouchableOpacity style={styles.checkRow} onPress={() => setMedical(!medical)}>
          <View style={[styles.checkbox, medical && styles.checkboxOn]}>
            {medical ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>I understand this is not a substitute for professional medical care</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FileText size={18} color="#0891b2" />
          <Text style={styles.cardTitle}>Privacy & Data Use</Text>
        </View>
        <Text style={styles.cardBody}>{PRIVACY_SUMMARY}</Text>
        <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
          <Text style={styles.link}>Read full Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkRow} onPress={() => setPrivacy(!privacy)}>
          <View style={[styles.checkbox, privacy && styles.checkboxOn]}>
            {privacy ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>I have read and accept the Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Health Data Processing</Text>
        <Text style={styles.cardBody}>
          I consent to VitaWeave storing and processing health data I enter for care coordination,
          including sharing with assigned ASHA workers and doctors per program access rules.
        </Text>
        <TouchableOpacity style={styles.checkRow} onPress={() => setDataProcessing(!dataProcessing)}>
          <View style={[styles.checkbox, dataProcessing && styles.checkboxOn]}>
            {dataProcessing ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>I consent to health data processing as described</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Users size={18} color="#0891b2" />
          <Text style={styles.cardTitle}>Parental / Guardian Consent</Text>
        </View>
        <Text style={styles.cardBody}>{PARENTAL_CONSENT_SUMMARY}</Text>
        <TouchableOpacity style={styles.checkRow} onPress={() => setIsMinor(!isMinor)}>
          <View style={[styles.checkbox, isMinor && styles.checkboxOn]}>
            {isMinor ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>
            This account or patient records concern a minor (under 18)
          </Text>
        </TouchableOpacity>
        {isMinor ? (
          <>
            <TextInput
              style={styles.input}
              value={guardianName}
              onChangeText={setGuardianName}
              placeholder="Guardian full name"
            />
            <TextInput
              style={styles.input}
              value={guardianRelationship}
              onChangeText={setGuardianRelationship}
              placeholder="Relationship (parent / legal guardian)"
            />
            <TouchableOpacity style={styles.checkRow} onPress={() => setGuardianAck(!guardianAck)}>
              <View style={[styles.checkbox, guardianAck && styles.checkboxOn]}>
                {guardianAck ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.checkLabel}>
                I am the parent or legal guardian and authorize processing of this minor&apos;s health data
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
        disabled={!canContinue}
        onPress={handleAccept}>
        <Text style={styles.continueText}>Accept & Continue</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => Linking.openURL('mailto:support@vitaweave.app')}>
        <Text style={styles.supportLink}>Questions? Contact support@vitaweave.app</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontFamily: 'Inter-Bold', fontSize: 26, color: '#0f172a', marginTop: 12 },
  subtitle: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b',
    textAlign: 'center', marginTop: 8, lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#0f172a' },
  cardBody: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 12 },
  link: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#0891b2', marginBottom: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  checkboxOn: { backgroundColor: '#0891b2', borderColor: '#0891b2' },
  checkMark: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  checkLabel: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: '#334155', lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#f8fafc',
  },
  continueBtn: {
    backgroundColor: '#0891b2', borderRadius: 14, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  continueBtnDisabled: { backgroundColor: '#94a3b8' },
  continueText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#fff' },
  supportLink: {
    fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748b',
    textAlign: 'center', marginTop: 20, textDecorationLine: 'underline',
  },
});
