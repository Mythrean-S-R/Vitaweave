import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
    ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    UserRound, Mail, Phone, MapPin, Stethoscope, Award,
    Settings, Bell, Globe, LogOut, ChevronRight, ShieldCheck,
} from 'lucide-react-native';
import { useUserProfile } from '../../hooks/useUserProfile';
import { LanguagePicker } from '../../components/LanguagePicker';
import { setLocaleFromProfile } from '../../lib/i18n';
import type { DoctorProfileStats } from '../../lib/profileStats';

const MENU_ITEMS = [
    { icon: Settings, label: 'Settings', color: '#64748b' },
    { icon: Bell, label: 'Notifications', color: '#d97706' },
    { icon: Globe, label: 'Language', color: '#7c3aed' },
    { icon: ShieldCheck, label: 'Privacy & Security', color: '#059669' },
];

export default function DoctorProfileScreen() {
    const router = useRouter();
    const { loading, profile, stats, notificationCount, saveProfile, logout } =
        useUserProfile('doctor');
    const doctorStats = stats as DoctorProfileStats | null;
    const [editOpen, setEditOpen] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [ward, setWard] = useState('');
    const [saving, setSaving] = useState(false);
    const [langOpen, setLangOpen] = useState(false);

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
            Alert.alert('Update failed', (error as Error).message ?? 'Could not save profile');
            return;
        }
        setEditOpen(false);
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/login');
                },
            },
        ]);
    };

    if (loading && !profile) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#0891b2" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.profileCard}>
                <View style={styles.avatarCircle}>
                    <UserRound size={40} color="#0891b2" />
                </View>
                <Text style={styles.name}>{profile?.name ?? 'Doctor'}</Text>
                <Text style={styles.specialty}>General Physician · {profile?.role ?? 'doctor'}</Text>
                <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
                    <Text style={styles.editBtnText}>Edit Profile</Text>
                </TouchableOpacity>
                <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                        <Stethoscope size={12} color="#0891b2" />
                        <Text style={styles.badgeText}>VitaWeave Provider</Text>
                    </View>
                    <View style={styles.badge}>
                        <Award size={12} color="#d97706" />
                        <Text style={styles.badgeText}>Level {profile?.level ?? 1}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Phone size={16} color="#94a3b8" />
                    <Text style={styles.infoText}>{profile?.phone || 'Add phone in edit'}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                    <Mail size={16} color="#94a3b8" />
                    <Text style={styles.infoText}>{profile?.email ?? '-'}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                    <MapPin size={16} color="#94a3b8" />
                    <Text style={styles.infoText}>{profile?.ward ? `Ward ${profile.ward}` : 'Ward not set'}</Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{doctorStats?.totalAppointments ?? 0}</Text>
                    <Text style={styles.statLabel}>Appointments</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{doctorStats?.patientCount ?? 0}</Text>
                    <Text style={styles.statLabel}>Patients</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{doctorStats?.campaignCount ?? 0}</Text>
                    <Text style={styles.statLabel}>Campaigns</Text>
                </View>
            </View>

            {MENU_ITEMS.map(({ icon: Icon, label, color }) => (
                <TouchableOpacity
                    key={label}
                    style={styles.menuItem}
                    onPress={() => {
                        if (label === 'Language') setLangOpen(true);
                    }}
                >
                    <View style={[styles.menuIcon, { backgroundColor: color + '15' }]}>
                        <Icon size={18} color={color} />
                    </View>
                    <Text style={styles.menuLabel}>{label}</Text>
                    {label === 'Notifications' && notificationCount > 0 && (
                        <View style={styles.menuBadge}>
                            <Text style={styles.menuBadgeText}>{notificationCount}</Text>
                        </View>
                    )}
                    <ChevronRight size={18} color="#cbd5e1" />
                </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut size={18} color="#dc2626" />
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <Modal visible={editOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />
                        <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} />
                        <TextInput style={styles.input} placeholder="Ward" value={ward} onChangeText={setWard} />
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditOpen(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
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
                        Alert.alert('Update failed', error instanceof Error ? error.message : 'Could not save language');
                        return;
                    }
                    await setLocaleFromProfile(language);
                }}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 20, paddingBottom: 40 },
    profileCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center',
        marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    avatarCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0f2fe',
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    name: { fontFamily: 'Inter-Bold', fontSize: 22, color: '#0f172a' },
    specialty: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b', marginTop: 4 },
    editBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#ecfeff', borderRadius: 20 },
    editBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#0891b2' },
    badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    badgeText: { fontFamily: 'Inter-Medium', fontSize: 11, color: '#475569' },
    infoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    infoText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#334155' },
    divider: { height: 1, backgroundColor: '#f1f5f9' },
    statsRow: {
        flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16,
        marginBottom: 16, alignItems: 'center',
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#0f172a' },
    statLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#94a3b8', marginTop: 2 },
    statDivider: { width: 1, height: 36, backgroundColor: '#e2e8f0' },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 14, padding: 14, marginBottom: 8,
    },
    menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    menuLabel: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 15, color: '#0f172a' },
    menuBadge: { backgroundColor: '#fee2e2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
    menuBadgeText: { fontFamily: 'Inter-Bold', fontSize: 11, color: '#dc2626' },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#fee2e2',
    },
    logoutText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#dc2626' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
    modalTitle: { fontFamily: 'Inter-Bold', fontSize: 18, marginBottom: 16 },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginBottom: 12, fontFamily: 'Inter-Regular' },
    saveBtn: { backgroundColor: '#0891b2', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
    saveBtnText: { color: '#fff', fontFamily: 'Inter-SemiBold' },
    cancelText: { textAlign: 'center', color: '#64748b', fontFamily: 'Inter-Medium', paddingVertical: 8 },
});
