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

export default function PatientTabLayout() {
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const { isReady } = useRoleGuard('patient');

    if (!isReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#059669" />
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
                tabBarActiveTintColor: '#059669',
                tabBarInactiveTintColor: '#64748b',
                tabBarLabelStyle: styles.tabBarLabel,
                headerStyle: styles.header,
                headerTitleStyle: styles.headerTitle,
                headerRight: () => (
                    <View style={styles.headerRight}>
                        <SyncStatusDot accentColor="#059669" />
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
                name="health-chat"
                options={{
                    title: 'AI Chat',
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
            <Tabs.Screen name="book-appointment" options={{ href: null }} />
            <Tabs.Screen name="telemedicine" options={{ href: null, title: 'Telemedicine' }} />
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
