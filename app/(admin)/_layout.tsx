import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useRoleGuard } from '../../lib/authGuard';

export default function AdminLayout() {
  const { isReady } = useRoleGuard('admin');

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#475569" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#0f172a' },
        contentStyle: { backgroundColor: '#f8fafc' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'District Supervisor' }} />
    </Stack>
  );
}
