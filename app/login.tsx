import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
// @ts-ignore
import {
    Stethoscope,
    Heart,
    Users,
    ChevronRight,
    ShieldCheck,
} from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    FadeInDown,
} from 'react-native-reanimated';
import { isDevModeEnabled } from '../lib/devMode';
import { loginDemoRole } from '../lib/auth';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function RoleSelector() {
    const router = useRouter();
    const devMode = isDevModeEnabled();

    const handleSkip = async () => {
        await loginDemoRole('asha');
        router.replace('/(asha)');
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}>

            {/* Logo & Title */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
                <View style={styles.logoCircle}>
                    <ShieldCheck size={40} color="#0891b2" />
                </View>
                <Text style={styles.title}>VitaWeave</Text>
                <Text style={styles.subtitle}>Rural Health. Connected.</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                <Text style={styles.selectLabel}>Select your role to continue</Text>
            </Animated.View>

            {/* Doctor Card */}
            <AnimatedTouchable
                entering={FadeInDown.delay(400).duration(600)}
                style={[styles.card, styles.cardDoctor]}
                activeOpacity={0.85}
                onPress={() => router.push('/doctor-login')}>
                <View style={[styles.cardIcon, { backgroundColor: '#e0f2fe' }]}>
                    <Stethoscope size={30} color="#0891b2" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: '#0891b2' }]}>Doctor</Text>
                    <Text style={styles.cardDesc}>Manage appointments, view patient records & AI diagnostics</Text>
                    <View style={styles.featureRow}>
                        <View style={[styles.featurePill, { backgroundColor: '#e0f2fe' }]}>
                            <Text style={[styles.featureText, { color: '#0891b2' }]}>Appointments</Text>
                        </View>
                        <View style={[styles.featurePill, { backgroundColor: '#e0f2fe' }]}>
                            <Text style={[styles.featureText, { color: '#0891b2' }]}>AI Diagnostics</Text>
                        </View>
                    </View>
                </View>
                <ChevronRight size={22} color="#0891b2" />
            </AnimatedTouchable>

            {/* ASHA/ANM Worker Card */}
            <AnimatedTouchable
                entering={FadeInDown.delay(550).duration(600)}
                style={[styles.card, styles.cardAsha]}
                activeOpacity={0.85}
                onPress={() => router.push('/asha-login')}>
                <View style={[styles.cardIcon, { backgroundColor: '#fef3c7' }]}>
                    <Users size={30} color="#d97706" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: '#d97706' }]}>ASHA/ANM Worker</Text>
                    <Text style={styles.cardDesc}>Field visits, patient tracking, community health signals</Text>
                    <View style={styles.featureRow}>
                        <View style={[styles.featurePill, { backgroundColor: '#fef3c7' }]}>
                            <Text style={[styles.featureText, { color: '#d97706' }]}>Field Visits</Text>
                        </View>
                        <View style={[styles.featurePill, { backgroundColor: '#fef3c7' }]}>
                            <Text style={[styles.featureText, { color: '#d97706' }]}>Health Surveys</Text>
                        </View>
                    </View>
                </View>
                <ChevronRight size={22} color="#d97706" />
            </AnimatedTouchable>

            {/* Patient Card */}
            <AnimatedTouchable
                entering={FadeInDown.delay(700).duration(600)}
                style={[styles.card, styles.cardPatient]}
                activeOpacity={0.85}
                onPress={() => router.push('/patient-login')}>
                <View style={[styles.cardIcon, { backgroundColor: '#d1fae5' }]}>
                    <Heart size={30} color="#059669" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: '#059669' }]}>Patient</Text>
                    <Text style={styles.cardDesc}>Track vitals, book appointments & access health records</Text>
                    <View style={styles.featureRow}>
                        <View style={[styles.featurePill, { backgroundColor: '#d1fae5' }]}>
                            <Text style={[styles.featureText, { color: '#059669' }]}>Track Vitals</Text>
                        </View>
                        <View style={[styles.featurePill, { backgroundColor: '#d1fae5' }]}>
                            <Text style={[styles.featureText, { color: '#059669' }]}>Health Records</Text>
                        </View>
                    </View>
                </View>
                <ChevronRight size={22} color="#059669" />
            </AnimatedTouchable>

            {devMode && (
            <Animated.View entering={FadeInDown.delay(850).duration(600)}>
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip for now (Dev Demo)</Text>
                </TouchableOpacity>
            </Animated.View>
            )}

            <TouchableOpacity style={styles.privacyLink} onPress={() => router.push('/privacy-policy')}>
                <Text style={styles.privacyText}>Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supervisorLink} onPress={() => router.push('/admin-login' as any)}>
                <Text style={styles.supervisorText}>District supervisor login</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: {
        padding: 24,
        paddingTop: Platform.OS === 'ios' ? 80 : 60,
        paddingBottom: 40,
    },
    header: { alignItems: 'center', marginBottom: 32 },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#0891b2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 34,
        color: '#0f172a',
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: '#64748b',
    },
    selectLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 18,
        marginBottom: 14,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        gap: 14,
    },
    cardDoctor: { borderColor: '#bae6fd' },
    cardAsha: { borderColor: '#fde68a' },
    cardPatient: { borderColor: '#a7f3d0' },
    cardIcon: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: { flex: 1 },
    cardTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        marginBottom: 4,
    },
    cardDesc: {
        fontFamily: 'Inter-Regular',
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
        marginBottom: 8,
    },
    featureRow: { flexDirection: 'row', gap: 6 },
    featurePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    featureText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 11,
    },
    skipBtn: { marginTop: 20, alignSelf: 'center' },
    skipText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: '#94a3b8',
        textDecorationLine: 'underline',
    },
    privacyLink: { marginTop: 16, alignSelf: 'center' },
    privacyText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748b',
        textDecorationLine: 'underline',
    },
    supervisorLink: { marginTop: 16, alignSelf: 'center' },
    supervisorText: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8' },
});
