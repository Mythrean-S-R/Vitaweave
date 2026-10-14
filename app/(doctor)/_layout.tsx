import { Tabs } from 'expo-router';
// @ts-ignore
import {
    LayoutDashboard,
    CalendarClock,
    BotMessageSquare as Bot,
    UserRound as User,
} from 'lucide-react-native';
import { Platform, StyleSheet, useWindowDimensions, View, ActivityIndicator } from 'react-native';
import { useRoleGuard } from '../../lib/authGuard';
import { SyncStatusDot } from '../../components/SyncStatusDot';

export default function DoctorTabLayout() {
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const { isReady } = useRoleGuard('doctor');

    if (!isReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0891b2" />
            </View>
        );
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                tabBarStyle: [
                    styles.tabBar,
                    Platform.OS === 'web' && styles.tabBarWeb,
                    isLargeScreen && styles.tabBarLarge,
                ],
                tabBarActiveTintColor: '#0891b2',
                tabBarInactiveTintColor: '#64748b',
                tabBarLabelStyle: styles.tabBarLabel,
                headerStyle: styles.header,
                headerTitleStyle: styles.headerTitle,
                headerRight: () => (
                    <View style={styles.headerRight}>
                        <SyncStatusDot accentColor="#0891b2" />
                    </View>
                ),
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} />,
                }}
            />
            <Tabs.Screen
                name="appointments"
                options={{
                    title: 'Appointments',
                    tabBarIcon: ({ color }) => <CalendarClock size={20} color={color} />,
                }}
            />
            <Tabs.Screen
                name="ai-diagnostics"
                options={{
                    title: 'AI',
                    tabBarIcon: ({ color }) => <Bot size={20} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={20} color={color} />,
                }}
            />
            {/* Secondary screens - reachable from Dashboard */}
            <Tabs.Screen name="refer-patient" options={{ href: null, title: 'Refer Patient' }} />
      <Tabs.Screen name="referrals" options={{ href: null, title: 'Referrals' }} />
      <Tabs.Screen name="campaigns" options={{ href: null, title: 'Campaigns' }} />
            <Tabs.Screen name="telemedicine" options={{ href: null, title: 'Telemedicine' }} />
            <Tabs.Screen name="insights" options={{ href: null, title: 'Insights' }} />
            <Tabs.Screen name="record-visit" options={{ href: null, title: 'Record Visit' }} />
            <Tabs.Screen name="add-patient" options={{ href: null, title: 'Add Patient' }} />
            <Tabs.Screen name="summarize-report" options={{ href: null, title: 'Summarize Report' }} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        height: Platform.OS === 'ios' ? 85 : 62,
        paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        paddingTop: 8,
    },
    tabBarWeb: {
        boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.05)',
    } as any,
    tabBarLarge: {
        height: 70,
        paddingBottom: 12,
        paddingTop: 12,
    },
    tabBarLabel: {
        fontFamily: 'Inter-Regular',
        fontSize: 10,
        marginTop: -4,
    },
    header: {
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        height: Platform.OS === 'ios' ? 90 : 60,
    },
    headerTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: '#0f172a',
    },
    headerRight: { marginRight: 14 },
});
