import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Alert,
} from 'react-native';
import {
  Calendar,
  Ambulance,
  FileText,
  Stethoscope,
  Syringe,
  FolderOpen,
  ChevronRight,
  Phone,
  Plus,
  CheckCircle,
} from 'lucide-react-native';
import { Colors, Fonts } from '../_constants/theme';

type Service = {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  tag: string;
  tagColor: string;
  tagBg: string;
  ctaLabel: string;
  ctaColor: string;
  ctaAlert: string;
  accentColor: string;
};

const SERVICES: Service[] = [
  {
    id: 1,
    title: 'Campaign Planner',
    description: 'Create and manage health awareness campaigns in your ward',
    icon: Calendar,
    tag: '2 Active',
    tagColor: Colors.secondary,
    tagBg: Colors.secondaryLight,
    ctaLabel: 'Plan New Campaign',
    ctaColor: Colors.secondary,
    ctaAlert: 'Campaign planner: Set goals, schedule dates, and assign volunteers for your next health drive.',
    accentColor: Colors.secondaryLight,
  },
  {
    id: 2,
    title: 'Emergency Hub',
    description: 'Quick-dial emergency contacts and ambulance booking',
    icon: Ambulance,
    tag: '24/7 Active',
    tagColor: Colors.riskHigh,
    tagBg: Colors.riskHighBg,
    ctaLabel: '🚨 Call Emergency',
    ctaColor: Colors.riskHigh,
    ctaAlert: 'Emergency contacts:\n• PHC Ambulance: 108\n• District Hospital: 0222-4567890\n• ASHA Supervisor: +91 98765 11111',
    accentColor: Colors.riskHighBg,
  },
  {
    id: 3,
    title: 'Government Schemes',
    description: 'PM-JAY, Janani Suraksha, and 3 more schemes available',
    icon: FileText,
    tag: '5 Schemes',
    tagColor: Colors.purple,
    tagBg: '#ede9fe',
    ctaLabel: 'Check Eligibility',
    ctaColor: Colors.purple,
    ctaAlert: 'Available schemes:\n• PM-JAY (Health insurance)\n• Janani Suraksha Yojana\n• PMMVY (Maternity benefit)\n• NHM Free Medicines\n• Ayushman Bharat',
    accentColor: '#ede9fe',
  },
  {
    id: 4,
    title: 'Telemedicine',
    description: 'Connect patients with doctors via video or phone consultation',
    icon: Stethoscope,
    tag: 'Available Now',
    tagColor: Colors.primary,
    tagBg: Colors.primaryLight,
    ctaLabel: 'Book Consultation',
    ctaColor: Colors.primary,
    ctaAlert: 'Telemedicine booking:\nAvailable Mon–Sat, 9AM–6PM.\nSpecialties: General, Gynaecology, Paediatrics.\nNext slot: Today 3:30 PM',
    accentColor: Colors.primaryLight,
  },
  {
    id: 5,
    title: 'Vaccination Tracker',
    description: 'Schedule and track immunisation drives in your village',
    icon: Syringe,
    tag: 'Next: Mar 5',
    tagColor: Colors.riskMedium,
    tagBg: Colors.riskMediumBg,
    ctaLabel: 'View Schedule',
    ctaColor: Colors.riskMedium,
    ctaAlert: 'Upcoming vaccination camps:\n• Mar 5 - DPT Booster (12 children)\n• Mar 12 - MR Vaccine (8 children)\n• Mar 20 - OPV Round (all under 5)',
    accentColor: Colors.riskMediumBg,
  },
  {
    id: 6,
    title: 'Health Records',
    description: 'Maintain and access digital health records for all patients',
    icon: FolderOpen,
    tag: '127 Records',
    tagColor: Colors.textSecondary,
    tagBg: '#f1f5f9',
    ctaLabel: 'Add Record',
    ctaColor: Colors.textSecondary,
    ctaAlert: 'Health Records: 127 patient records stored.\nLast sync: 18 Feb 2026, 6:00 PM.\nOffline records pending sync: 3',
    accentColor: '#f1f5f9',
  },
];

export default function ServicesScreen() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      <View style={[styles.grid, isLargeScreen && styles.gridLarge]}>
        {SERVICES.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.card,
              isLargeScreen ? styles.cardLarge : styles.cardMobile,
            ]}
            onPress={() => Alert.alert(service.title, service.description)}
            activeOpacity={0.85}>

            {/* Card Header */}
            <View style={[styles.cardHeader, { backgroundColor: service.accentColor }]}>
              <View style={styles.iconContainer}>
                <service.icon size={24} color={service.tagColor} />
              </View>
              <View style={[styles.tagBadge, { backgroundColor: service.tagColor + '20' }]}>
                <Text style={[styles.tagText, { color: service.tagColor }]}>{service.tag}</Text>
              </View>
            </View>

            {/* Card Body */}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{service.title}</Text>
              <Text style={styles.cardDescription}>{service.description}</Text>

              {/* CTA Button */}
              <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: service.tagColor + '15', borderColor: service.tagColor + '40' }]}
                onPress={() => Alert.alert(service.title, service.ctaAlert)}>
                <Text style={[styles.ctaBtnText, { color: service.tagColor }]}>{service.ctaLabel}</Text>
                <ChevronRight size={14} color={service.tagColor} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: {
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  grid: { paddingHorizontal: 16, gap: 16 },
  gridLarge: { paddingHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardMobile: { width: '100%' },
  cardLarge: { width: '47%' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontFamily: Fonts.semiBold, fontSize: 11 },
  cardContent: { padding: 16, paddingTop: 12 },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textPrimary, marginBottom: 6 },
  cardDescription: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  ctaBtnText: { fontFamily: Fonts.semiBold, fontSize: 13 },
});