import { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Radio, Activity } from 'lucide-react-native';
import { Colors, Fonts, getRiskColors } from '../_constants/theme';
import {
    PHARMACY_TRENDS,
    SYMPTOM_REPORTS,
    COMMUNITY_ALERTS,
    WEEKLY_TRENDS,
    COMMUNITY_RISK_LEVEL,
} from '../_constants/data';
import {
    getCommunityAlerts,
    getPharmacyTrends,
    getSymptomReports,
    getWeeklyTrends
} from '../../lib/api';
import { resolveWithDemoFallback } from '../../lib/dataPolicy';
import { summarizeCommunitySignals, computeCommunityRiskLevel } from '../../lib/communityHealth';

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
    if (trend === 'up') return <TrendingUp size={14} color={Colors.riskHigh} />;
    if (trend === 'down') return <TrendingDown size={14} color={Colors.riskLow} />;
    return <Minus size={14} color={Colors.textMuted} />;
}

export default function CommunitySignalsScreen() {
    const [alerts, setAlerts] = useState(COMMUNITY_ALERTS);
    const [pharmacy, setPharmacy] = useState(PHARMACY_TRENDS);
    const [symptoms, setSymptoms] = useState(SYMPTOM_REPORTS);
    const [weekly, setWeekly] = useState(WEEKLY_TRENDS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSignals();
    }, []);

    const loadSignals = async () => {
        setLoading(true);
        const [a, p, s, w] = await Promise.all([
            getCommunityAlerts(),
            getPharmacyTrends(),
            getSymptomReports(),
            getWeeklyTrends(),
        ]);

        try {
            const { runOutbreakDetectionAndFlag } = await import('../../lib/surveillance/clusterDetector');
            await runOutbreakDetectionAndFlag();
        } catch {
            // ignore
        }

        const refreshedAlerts = await getCommunityAlerts();
        setAlerts(resolveWithDemoFallback(refreshedAlerts.length ? refreshedAlerts : a, COMMUNITY_ALERTS));
        setPharmacy(resolveWithDemoFallback(p, PHARMACY_TRENDS));
        setSymptoms(resolveWithDemoFallback(s, SYMPTOM_REPORTS));
        setWeekly(resolveWithDemoFallback(w, WEEKLY_TRENDS));
        setLoading(false);
    };

    const signalSummary = summarizeCommunitySignals(alerts);
    const riskColors = getRiskColors(signalSummary.riskLevel);
    const maxBarValue = useMemo(() => Math.max(...weekly.map((t) => t.value), 40), [weekly]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}>

            {/* Ward Health Status Banner */}
            <View style={[styles.wardBanner, { backgroundColor: riskColors.bg, borderColor: riskColors.text + '50' }]}>
                <View style={styles.wardBannerLeft}>
                    <Radio size={20} color={riskColors.text} />
                    <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.wardBannerTitle, { color: riskColors.text }]}>
                            Ward Health Status - {signalSummary.riskLevel} Risk
                        </Text>
                        <Text style={[styles.wardBannerSub, { color: riskColors.text + 'cc' }]}>
                            {signalSummary.summary}
                        </Text>
                    </View>
                </View>
                <View style={[styles.wardRiskPill, { backgroundColor: riskColors.text }]}>
                    <Text style={styles.wardRiskText}>{COMMUNITY_RISK_LEVEL} Risk</Text>
                </View>
            </View>

            {/* Anomaly Alerts */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={16} color={Colors.riskHigh} />
                        <Text style={styles.sectionTitle}>Anomaly Alerts</Text>
                    </View>
                    {loading && <ActivityIndicator size="small" color={Colors.primary} />}
                </View>
                {alerts.map((alert) => {
                    const colors = getRiskColors(
                        alert.severity === 'Critical' ? 'High' : alert.severity
                    );
                    return (
                        <TouchableOpacity
                            key={alert.id}
                            style={[styles.alertCard, { borderLeftColor: colors.text }]}
                            onPress={() => Alert.alert(alert.title, alert.description)}>
                            <Text style={styles.alertEmoji}>{alert.icon}</Text>
                            <View style={styles.alertBody}>
                                <View style={styles.alertTitleRow}>
                                    <Text style={styles.alertTitle}>{alert.title}</Text>
                                    <View style={[styles.severityPill, { backgroundColor: colors.bg }]}>
                                        <Text style={[styles.severityText, { color: colors.text }]}>{alert.severity}</Text>
                                    </View>
                                </View>
                                <Text style={styles.alertDesc}>{alert.description}</Text>
                                <Text style={styles.alertDate}>{(alert as any).date}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Pharmacy Trend Tracker */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Activity size={16} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Pharmacy Trends</Text>
                    </View>
                    {loading && <ActivityIndicator size="small" color={Colors.primary} />}
                </View>
                <View style={styles.card}>
                    <Text style={styles.cardSubtitle}>Top medicines purchased this week</Text>
                    {pharmacy.map((item) => {
                        const max = (item as any).max_count || item.maxCount || 200;
                        const barWidth = `${(item.count / max) * 100}%` as any;
                        return (
                            <View key={item.id} style={styles.barRow}>
                                <View style={styles.barLabelRow}>
                                    <Text style={styles.barLabel}>{item.medicine}</Text>
                                    <View style={styles.barMeta}>
                                        <TrendIcon trend={item.trend} />
                                        <Text style={styles.barCount}>{item.count}</Text>
                                    </View>
                                </View>
                                <View style={styles.barTrack}>
                                    <View
                                        style={[
                                            styles.barFill,
                                            {
                                                width: barWidth,
                                                backgroundColor: item.trend === 'up'
                                                    ? Colors.riskMedium
                                                    : item.trend === 'down'
                                                        ? Colors.riskLow
                                                        : Colors.primary,
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Symptom Reports */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Activity size={16} color={Colors.purple} />
                        <Text style={styles.sectionTitle}>Symptom Reports</Text>
                    </View>
                    {loading && <ActivityIndicator size="small" color={Colors.primary} />}
                </View>
                <View style={styles.card}>
                    <Text style={styles.cardSubtitle}>Community-reported symptoms this week</Text>
                    {symptoms.map((item) => (
                        <View key={item.id} style={styles.symptomRow}>
                            <View style={styles.symptomLeft}>
                                <Text style={styles.symptomName}>{item.symptom}</Text>
                                <Text style={styles.symptomWard}>{item.ward}</Text>
                            </View>
                            <View style={styles.symptomRight}>
                                <TrendIcon trend={item.trend} />
                                <View style={[
                                    styles.countBadge,
                                    {
                                        backgroundColor: item.count > 25
                                            ? Colors.riskHighBg
                                            : item.count > 15
                                                ? Colors.riskMediumBg
                                                : Colors.riskLowBg,
                                    },
                                ]}>
                                    <Text style={[
                                        styles.countBadgeText,
                                        {
                                            color: item.count > 25
                                                ? Colors.riskHigh
                                                : item.count > 15
                                                    ? Colors.riskMedium
                                                    : Colors.riskLow,
                                        },
                                    ]}>
                                        {item.count} cases
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* Weekly Health Trends */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={16} color={Colors.secondary} />
                        <Text style={styles.sectionTitle}>Weekly Case Trend</Text>
                    </View>
                    {loading && <ActivityIndicator size="small" color={Colors.primary} />}
                </View>
                <View style={styles.card}>
                    <Text style={styles.cardSubtitle}>Total reported cases per day (all symptoms)</Text>
                    <View style={styles.barChart}>
                        {weekly.map((day) => {
                            const label = (day as any).label || (day as any).day;
                            const heightPct = (day.value / maxBarValue) * 100;
                            const isToday = label === 'Tue'; // mock "today"
                            return (
                                <View key={label} style={styles.chartCol}>
                                    <Text style={styles.chartValue}>{day.value}</Text>
                                    <View style={styles.chartBarTrack}>
                                        <View
                                            style={[
                                                styles.chartBarFill,
                                                {
                                                    height: `${heightPct}%` as any,
                                                    backgroundColor: isToday ? Colors.primary : Colors.primaryLight,
                                                    borderColor: isToday ? Colors.primaryDark : Colors.primary,
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={[styles.chartLabel, isToday && { color: Colors.primary, fontFamily: Fonts.semiBold }]}>
                                        {label}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    contentContainer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 100 : 80,
        gap: 4,
    },
    // Ward Banner
    wardBanner: {
        borderRadius: 14,
        borderWidth: 1.5,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    wardBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    wardBannerTitle: { fontFamily: Fonts.semiBold, fontSize: 13, marginBottom: 2 },
    wardBannerSub: { fontFamily: Fonts.regular, fontSize: 11 },
    wardRiskPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    wardRiskText: { fontFamily: Fonts.semiBold, fontSize: 11, color: '#fff' },
    // Section
    section: { marginBottom: 4 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        marginTop: 12,
    },
    sectionTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.textPrimary },
    // Card
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    cardSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textMuted,
        marginBottom: 14,
    },
    // Alert Cards
    alertCard: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 3,
        elevation: 2,
        gap: 12,
        alignItems: 'flex-start',
    },
    alertEmoji: { fontSize: 22, marginTop: 2 },
    alertBody: { flex: 1 },
    alertTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
        gap: 8,
    },
    alertTitle: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textPrimary, flex: 1 },
    severityPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
    severityText: { fontFamily: Fonts.semiBold, fontSize: 10 },
    alertDesc: {
        fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary,
        lineHeight: 17, marginBottom: 4,
    },
    alertDate: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
    // Bar chart (pharmacy)
    barRow: { marginBottom: 12 },
    barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    barLabel: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textPrimary, flex: 1 },
    barMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    barCount: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textSecondary },
    barTrack: {
        height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 4 },
    // Symptom rows
    symptomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    symptomLeft: { flex: 1 },
    symptomName: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textPrimary },
    symptomWard: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, marginTop: 2 },
    symptomRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    countBadgeText: { fontFamily: Fonts.semiBold, fontSize: 12 },
    // Weekly bar chart
    barChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 120,
        gap: 6,
    },
    chartCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    chartValue: {
        fontFamily: Fonts.semiBold, fontSize: 10, color: Colors.textMuted, marginBottom: 4,
    },
    chartBarTrack: {
        width: '100%', flex: 1, justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden',
    },
    chartBarFill: { width: '100%', borderRadius: 4, borderWidth: 1 },
    chartLabel: {
        fontFamily: Fonts.regular, fontSize: 11, color: Colors.textSecondary, marginTop: 5,
    },
});
