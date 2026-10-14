import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import {
  Settings2,
  Bell,
  Shield,
  Languages,
  LogOut,
  ChevronRight,
  Edit2,
  Wifi,
  WifiOff,
  Award,
  Heart,
  Zap,
} from 'lucide-react-native';
import { Colors, Fonts } from '../_constants/theme';
import { useRouter } from 'expo-router';
import { useUserProfile } from '../../hooks/useUserProfile';
import { LanguagePicker } from '../../components/LanguagePicker';
import { setLocaleFromProfile } from '../../lib/i18n';
import type { AshaProfileStats } from '../../lib/profileStats';

const MENU_ITEMS = [
  { id: 1, title: 'Settings', titleHi: 'सेटिंग्स', icon: Settings2, danger: false },
  { id: 2, title: 'Notifications', titleHi: 'सूचनाएं', icon: Bell, danger: false },
  { id: 3, title: 'Privacy & Security', titleHi: 'गोपनीयता', icon: Shield, danger: false },
  { id: 4, title: 'Language', titleHi: 'भाषा', icon: Languages, danger: false },
  { id: 5, title: 'Logout', titleHi: 'लॉगआउट', icon: LogOut, danger: true },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const [langOpen, setLangOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ward, setWard] = useState('');
  const [saving, setSaving] = useState(false);
  const { loading, profile, stats, notificationCount, saveProfile, logout } = useUserProfile('asha');
  const ashaStats = stats as AshaProfileStats | null;
  const synced = true;

  const hi = profile?.language === 'Hindi' || profile?.language === 'हिंदी';

  const openEdit = () => {
    setName(profile?.name ?? '');
    setPhone(profile?.phone ?? '');
    setWard(profile?.ward ?? '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveProfile({ name, phone, ward });
    setSaving(false);
    if (error) {
      Alert.alert(hi ? 'त्रुटि' : 'Update failed', (error as Error).message ?? 'Could not save profile');
      return;
    }
    setEditOpen(false);
  };

  const handleMenuPress = (item: typeof MENU_ITEMS[0]) => {
    if (item.title === 'Logout') {
      Alert.alert(
        hi ? 'लॉगआउट' : 'Logout',
        hi ? 'क्या आप लॉगआउट करना चाहते हैं?' : 'Are you sure you want to logout?',
        [
          { text: hi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
          {
            text: hi ? 'लॉगआउट' : 'Logout',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/login');
            }
          },
        ]
      );
    } else if (item.title === 'Language') {
      setLangOpen(true);
    } else {
      Alert.alert(item.title, `Opening ${item.title}...`);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        isLargeScreen && styles.contentContainerLarge,
      ]}>

      {/* Profile Header */}
      <View style={styles.header}>
        {/* Sync Indicator */}
        <View style={[styles.syncPill, { backgroundColor: synced ? Colors.riskLowBg : Colors.riskMediumBg }]}>
          {synced
            ? <Wifi size={12} color={Colors.riskLow} />
            : <WifiOff size={12} color={Colors.riskMedium} />}
          <Text style={[styles.syncText, { color: synced ? Colors.riskLow : Colors.riskMedium }]}>
            {synced ? (hi ? 'सिंक हो गया' : 'Synced') : (hi ? 'सिंक बाकी' : 'Pending sync')}
          </Text>
        </View>

        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=200&auto=format&fit=crop' }}
            style={styles.profileImage}
          />
          <TouchableOpacity
            style={styles.editAvatar}
            onPress={() => Alert.alert(hi ? 'फ़ोटो बदलें' : 'Edit Photo', 'Photo upload coming in Phase 2!')}>
            <Edit2 size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.name}>{profile?.name || (hi ? 'ASHA कार्यकर्ता' : 'ASHA Worker')}</Text>
          {loading && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>
        <Text style={styles.roleText}>
          ASHA {hi ? 'कार्यकर्ता' : 'Worker'} · {hi ? 'स्तर' : 'Level'} {profile?.level ?? 1}
        </Text>
        <Text style={styles.location}>
          📍 {profile?.ward ? `${hi ? 'वार्ड' : 'Ward'} ${profile.ward}` : (hi ? 'स्थान सेट नहीं' : 'Location not set')}
        </Text>

        <TouchableOpacity style={styles.editProfileBtn} onPress={openEdit}>
          <Text style={styles.editProfileText}>{hi ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{ashaStats?.patientCount ?? 0}</Text>
          <Text style={styles.statLabel}>{hi ? 'मरीज़' : 'Patients'}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{ashaStats?.pendingTasks ?? 0}</Text>
          <Text style={styles.statLabel}>{hi ? 'कार्य' : 'Tasks'}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{ashaStats?.dueVaccinations ?? 0}</Text>
          <Text style={styles.statLabel}>{hi ? 'टीके' : 'Vaccines'}</Text>
        </View>
      </View>

      {/* Impact Metrics */}
      <View style={styles.impactCard}>
        <View style={styles.impactHeader}>
          <Zap size={16} color={Colors.primary} />
          <Text style={styles.impactTitle}>{hi ? 'आपका प्रभाव' : 'Your Impact'}</Text>
        </View>
        <View style={styles.impactRow}>
          <View style={styles.impactItem}>
            <Heart size={18} color={Colors.riskHigh} />
            <Text style={styles.impactNum}>{profile?.lives_impacted ?? 0}</Text>
            <Text style={styles.impactLabel}>{hi ? 'जीवन प्रभावित' : 'Lives Impacted'}</Text>
          </View>
          <View style={styles.impactDivider} />
          <View style={styles.impactItem}>
            <Bell size={18} color={Colors.riskMedium} />
            <Text style={styles.impactNum}>{ashaStats?.activeAlerts ?? 0}</Text>
            <Text style={styles.impactLabel}>{hi ? 'अलर्ट' : 'Alerts'}</Text>
          </View>
          <View style={styles.impactDivider} />
          <View style={styles.impactItem}>
            <Award size={18} color={Colors.purple} />
            <Text style={styles.impactNum}>{ashaStats?.dueVaccinations ?? 0}</Text>
            <Text style={styles.impactLabel}>{hi ? 'टीके बाकी' : 'Vaccines Due'}</Text>
          </View>
        </View>
      </View>

      {/* Certification Badge */}
      <View style={styles.certCard}>
        <View style={styles.certIcon}>
          <Text style={styles.certEmoji}>🏅</Text>
        </View>
        <View style={styles.certInfo}>
          <Text style={styles.certTitle}>
            {hi ? 'प्रमाणित ASHA कार्यकर्ता' : 'Certified ASHA Worker'}
          </Text>
          <Text style={styles.certSub}>
            {hi ? 'राष्ट्रीय स्वास्थ्य मिशन · दिसंबर 2027 तक' : 'National Health Mission · Valid till Dec 2027'}
          </Text>
          {/* Expiry progress bar */}
          <View style={styles.certProgressTrack}>
            <View style={[styles.certProgressFill, { width: '72%' }]} />
          </View>
          <Text style={styles.certProgressLabel}>
            {hi ? '72% अवधि शेष' : '72% validity remaining'}
          </Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {MENU_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              index === MENU_ITEMS.length - 1 && styles.menuItemLast,
            ]}
            onPress={() => handleMenuPress(item)}
            activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, item.danger && styles.menuIconDanger]}>
                <item.icon size={18} color={item.danger ? Colors.riskHigh : Colors.textSecondary} />
              </View>
              <Text style={[styles.menuItemTitle, item.danger && styles.menuItemDanger]}>
                {hi ? item.titleHi : item.title}
              </Text>
            </View>
            <View style={styles.menuItemRight}>
              {item.title === 'Language' && (
                <View style={styles.langBadge}>
                  <Text style={styles.langBadgeText}>{profile?.language ?? 'English'}</Text>
                </View>
              )}
              {item.title === 'Notifications' && notificationCount > 0 && (
                <View style={[styles.badge, { backgroundColor: Colors.danger }]}>
                  <Text style={[styles.badgeText, { color: '#fff' }]}>{notificationCount}</Text>
                </View>
              )}
              {!item.danger && <ChevronRight size={16} color={Colors.textMuted} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={editOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{hi ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}</Text>
            <TextInput style={styles.input} placeholder={hi ? 'नाम' : 'Full name'} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder={hi ? 'फ़ोन' : 'Phone'} value={phone} onChangeText={setPhone} />
            <TextInput style={styles.input} placeholder={hi ? 'वार्ड' : 'Ward'} value={ward} onChangeText={setWard} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{hi ? 'सहेजें' : 'Save'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditOpen(false)}>
              <Text style={styles.cancelText}>{hi ? 'रद्द करें' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <LanguagePicker
        visible={langOpen}
        currentLanguage={profile?.language}
        onClose={() => setLangOpen(false)}
        onSelect={async (language) => {
          const { error } = await saveProfile({ language });
          if (error) {
            Alert.alert(hi ? 'त्रुटि' : 'Update failed', (error as Error).message ?? 'Could not save language');
            return;
          }
          await setLocaleFromProfile(language);
        }}
      />

      <Text style={styles.version}>VitaWeave v2.0 · {hi ? 'ASHA कार्यकर्ताओं के लिए' : 'Built for ASHA Workers'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 100 : 80 },
  contentContainerLarge: { padding: 24, maxWidth: 768, alignSelf: 'center', width: '100%' },
  // Header
  header: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  syncText: { fontFamily: Fonts.semiBold, fontSize: 11 },
  avatarContainer: { position: 'relative', marginBottom: 14 },
  profileImage: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: Colors.primaryLight,
  },
  editAvatar: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  name: { fontFamily: Fonts.bold, fontSize: 22, color: Colors.textPrimary, marginBottom: 4 },
  roleText: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.primary, marginBottom: 4 },
  location: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary, marginBottom: 14 },
  // Role Selector
  roleSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  rolePill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border,
  },
  rolePillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rolePillText: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.textSecondary },
  rolePillTextActive: { color: '#fff' },
  editProfileBtn: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  editProfileText: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.primary },
  // Stats
  statsContainer: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14,
    padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statNumber: { fontFamily: Fonts.bold, fontSize: 24, color: Colors.textPrimary, marginBottom: 2 },
  statLabel: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary },
  // Impact Metrics
  impactCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  impactHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  impactTitle: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.textPrimary },
  impactRow: { flexDirection: 'row', alignItems: 'center' },
  impactItem: { flex: 1, alignItems: 'center', gap: 4 },
  impactDivider: { width: 1, height: 50, backgroundColor: Colors.border },
  impactNum: { fontFamily: Fonts.bold, fontSize: 22, color: Colors.textPrimary },
  impactLabel: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  // Cert
  certCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fffbeb', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#fde68a', gap: 12,
  },
  certIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center',
  },
  certEmoji: { fontSize: 22 },
  certInfo: { flex: 1 },
  certTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#92400e', marginBottom: 2 },
  certSub: { fontFamily: Fonts.regular, fontSize: 12, color: '#b45309', marginBottom: 8 },
  certProgressTrack: {
    height: 5, backgroundColor: '#fde68a', borderRadius: 3, overflow: 'hidden', marginBottom: 4,
  },
  certProgressFill: { height: '100%', backgroundColor: '#d97706', borderRadius: 3 },
  certProgressLabel: { fontFamily: Fonts.regular, fontSize: 10, color: '#b45309' },
  // Menu
  menu: {
    backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2, marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center',
  },
  menuIconDanger: { backgroundColor: Colors.riskHighBg },
  menuItemTitle: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary },
  menuItemDanger: { color: Colors.riskHigh },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontFamily: Fonts.semiBold, fontSize: 11 },
  langBadge: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, backgroundColor: Colors.primaryLight,
  },
  langBadgeText: { fontFamily: Fonts.semiBold, fontSize: 11, color: Colors.primary },
  version: {
    fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted,
    textAlign: 'center', marginBottom: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontFamily: Fonts.bold, fontSize: 18, marginBottom: 16, color: Colors.textPrimary },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, marginBottom: 12, fontFamily: Fonts.regular },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
  saveBtnText: { color: '#fff', fontFamily: Fonts.semiBold },
  cancelText: { textAlign: 'center', color: Colors.textSecondary, fontFamily: Fonts.medium, paddingVertical: 8 },
});