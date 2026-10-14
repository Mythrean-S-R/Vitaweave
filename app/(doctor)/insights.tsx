import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
// @ts-ignore
import { ChevronLeft, TrendingUp, TrendingDown, AlertCircle, Pill, Activity } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getPharmacyTrends, getSymptomReports, getCommunityAlerts } from '../../lib/api';
import type { PharmacyTrend, SymptomReport, CommunityAlert } from '../_constants/data';

export default function InsightsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [pharmacy, setPharmacy] = useState<PharmacyTrend[]>([]);
    const [symptoms, setSymptoms] = useState<SymptomReport[]>([]);
    const [alerts, setAlerts] = useState<CommunityAlert[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [pharmData, sympData, alertData] = await Promise.all([
            getPharmacyTrends(),
            getSymptomReports(),
            getCommunityAlerts(),
        ]);
        setPharmacy(pharmData);
        setSymptoms(sympData);
        setAlerts(alertData);
        setLoading(false);
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0891b2" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Full Analysis & Insights</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Community Alerts</Text>
                {alerts.map(alert => (
                    <View key={alert.id} style={[styles.card, { borderLeftColor: alert.severity === 'High' ? '#dc2626' : alert.severity === 'Medium' ? '#d97706' : '#059669' }]}>
                        <View style={styles.alertHeader}>
                            <Text style={styles.alertIcon}>{alert.icon}</Text>
                            <Text style={styles.alertTitle}>{alert.title}</Text>
                        </View>
                        <Text style={styles.alertDesc}>{alert.description}</Text>
                        <Text style={styles.alertDate}>{alert.date}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Symptom Reports</Text>
                {symptoms.map(symp => (
                    <View key={symp.id} style={styles.rowItem}>
                        <Activity size={20} color="#0891b2" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.itemName}>{symp.symptom}</Text>
                            <Text style={styles.itemSub}>{symp.ward}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.itemCount}>{symp.count} cases</Text>
                            <View style={styles.trendWrap}>
                                {symp.trend === 'up' ? <TrendingUp size={14} color="#dc2626" /> : symp.trend === 'down' ? <TrendingDown size={14} color="#059669" /> : null}
                                <Text style={[styles.itemTrend, { color: symp.trend === 'up' ? '#dc2626' : symp.trend === 'down' ? '#059669' : '#94a3b8' }]}>
                                    {symp.trend}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pharmacy Trends</Text>
                {pharmacy.map(pharm => (
                    <View key={pharm.id} style={styles.rowItem}>
                        <Pill size={20} color="#7c3aed" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.itemName}>{pharm.medicine}</Text>
                            <View style={styles.barBg}>
                                <View style={[styles.barFill, { width: `${(pharm.count / pharm.maxCount) * 100}%` }]} />
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', minWidth: 60 }}>
                            <Text style={styles.itemCount}>{pharm.count}</Text>
                            <Text style={styles.itemSub}>units</Text>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    backBtn: { marginRight: 15 },
    headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#0f172a' },
    section: { padding: 20 },
    sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#0f172a', marginBottom: 15 },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, borderLeftWidth: 4 },
    alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    alertIcon: { fontSize: 16, marginRight: 8 },
    alertTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0f172a' },
    alertDesc: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 5 },
    alertDate: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#94a3b8' },
    rowItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
    itemName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0f172a', marginBottom: 2 },
    itemSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b' },
    itemCount: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#0f172a' },
    trendWrap: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
    itemTrend: { fontFamily: 'Inter-Medium', fontSize: 10, textTransform: 'uppercase' },
    barBg: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginTop: 6, overflow: 'hidden' },
    barFill: { height: '100%', backgroundColor: '#7c3aed', borderRadius: 3 },
});
