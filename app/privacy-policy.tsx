import React from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
// @ts-ignore
import { ChevronLeft } from 'lucide-react-native';

const SECTIONS = [
  {
    title: '1. Who We Are',
    body: 'VitaWeave is a rural healthcare coordination platform operated for community health programs. This policy explains how we handle personal and health-related information.',
  },
  {
    title: '2. Information We Collect',
    body: 'Account data (name, email, role), patient records entered by authorized workers, appointment details, vitals, medications, AI chat transcripts, and technical logs (device type, app version, error reports).',
  },
  {
    title: '3. How We Use Information',
    body: 'To provide care coordination between ASHA workers, doctors, and patients; generate AI-assisted summaries; enable telemedicine; improve reliability and security; and comply with legal obligations.',
  },
  {
    title: '4. Legal Basis & Consent',
    body: 'Processing is based on your consent, legitimate interest in delivering healthcare services, and applicable public health program requirements. You may withdraw consent by contacting your administrator, though some features may no longer work.',
  },
  {
    title: '5. Data Storage & Security',
    body: 'Data is stored in Supabase (PostgreSQL) preferably in ap-south-1 (Mumbai) for India localization, with row-level security, encrypted in transit (TLS), field-level encryption for sensitive local SQLite columns, and access limited by role.',
  },
  {
    title: '6. Sharing',
    body: 'We do not sell personal data. Information is shared only with authorized healthcare workers in your care network, infrastructure providers (hosting, error monitoring), and when required by law.',
  },
  {
    title: '7. Retention',
    body: 'Records are retained per program policy and regulatory requirements. Chat history and logs may be deleted on request where legally permissible.',
  },
  {
    title: '8. Your Rights',
    body: 'Depending on applicable law (including India DPDP Act), you may download your data or request erasure from Profile → Data rights in the app, or contact support@vitaweave.app / your program administrator.',
  },
  {
    title: '9. Children',
    body: 'Patient records for minors (under 18) require parental or legal guardian consent collected in-app (guardian name, relationship, and acknowledgment) before health data is processed. Authorized health workers may manage minor records only under program supervision and applicable law. Hosting a public copy of this policy at the URL in app.json (extra.privacyPolicyUrl) is an organizational step for store listings.',
  },
  {
    title: '10. Canonical copy',
    body: 'This in-app Privacy Policy is the canonical text for VitaWeave until a public web page is published at the configured privacyPolicyUrl. Store listings should link to the hosted URL once DNS/hosting is live.',
  },
  {
    title: '11. Changes',
    body: 'We may update this policy. Material changes will require re-acceptance in the app. Last updated: July 2026.',
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#0891b2" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, paddingTop: 40 },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Inter-Bold', fontSize: 22, color: '#0f172a' },
  section: { marginBottom: 20 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#0f172a', marginBottom: 6 },
  sectionBody: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#475569', lineHeight: 22 },
});
