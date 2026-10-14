import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { supabase } from './supabase';
import { writeThroughQueue } from './syncEngine';
import { logger } from './logger';

function canUsePushNotifications(): boolean {
  if (Platform.OS === 'web' || __DEV__) return false;
  try {
    if (isRunningInExpoGo()) return false;
  } catch {}
  if (Constants.appOwnership === 'expo') return false;
  // @ts-ignore
  if (Constants.executionEnvironment === 'storeClient') return false;
  if ((Constants as any)?.expoGoConfig != null) return false;
  return true;
}

async function loadNotifications() {
  if (!canUsePushNotifications()) return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

export async function registerDevicePushToken(profileId: string): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const expoPushToken = tokenResult.data;
    if (!expoPushToken) return;

    const payload = {
      profile_id: profileId,
      expo_push_token: expoPushToken,
      platform: Platform.OS,
    };

    await writeThroughQueue({
      table: 'push_tokens',
      action: 'insert',
      payload,
      conflictKey: `push_tokens:${profileId}:${expoPushToken}`,
      online: async () => {
        const { data, error } = await supabase
          .from('push_tokens')
          .upsert(payload, { onConflict: 'profile_id,expo_push_token' })
          .select()
          .single();
        return { data, error };
      },
    });
  } catch (error) {
    logger.warn('Push token registration skipped:', error);
  }
}
