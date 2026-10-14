import { useEffect, useState } from 'react';
import { Stack, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { initializeSync } from '../lib/api';
import { ProductionInitializer } from '../lib/production';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Analytics } from '../lib/analytics';
import { logger } from '../lib/logger';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useFrameworkReady();
  const pathname = usePathname();
  const [fontTimeout, setFontTimeout] = useState(false);

  useEffect(() => {
    try {
      ProductionInitializer.initializeFromEnv();
    } catch (error) {
      logger.warn('Production init skipped:', error);
    }

    initializeSync().catch((error) => logger.warn('Sync init failed:', error));

    const timer = setTimeout(() => {
      setFontTimeout(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (pathname) {
      Analytics.trackScreen(pathname);
    }
  }, [pathname]);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError || fontTimeout) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, fontTimeout]);

  if (!fontsLoaded && !fontError && !fontTimeout) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="consent" />
        <Stack.Screen name="privacy-policy" options={{ headerShown: true, title: 'Privacy Policy' }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="doctor-login" />
        <Stack.Screen name="asha-login" />
        <Stack.Screen name="patient-login" />
        <Stack.Screen name="admin-login" />
        <Stack.Screen name="(asha)" />
        <Stack.Screen name="(doctor)" />
        <Stack.Screen name="(patient)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'Not Found' }} />
      </Stack>
    </ErrorBoundary>
  );
}
