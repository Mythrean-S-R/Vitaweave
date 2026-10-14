import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

const PERMISSION_ASKED_KEY = '@vitaweave_notifications_asked';
const LAST_ALERT_DIGEST_KEY = '@vitaweave_last_alert_digest';

type NotificationModule = typeof import('expo-notifications');

let Notifications: NotificationModule | null = null;
let notificationsUnavailable = false;

function canUseNotifications(): boolean {
  if (Platform.OS === 'web' || __DEV__) return false;
  // Push/remote notifications were removed from Expo Go Android in SDK 53+
  // Importing expo-notifications in Expo Go Android throws a fatal error at module evaluation
  try {
    if (isRunningInExpoGo()) return false;
  } catch {}
  if (Constants.appOwnership === 'expo') return false;
  // @ts-ignore
  if (Constants.executionEnvironment === 'storeClient') return false;
  if ((Constants as any)?.expoGoConfig != null) return false;
  return true;
}

async function loadNotifications(): Promise<NotificationModule | null> {
  if (!canUseNotifications() || notificationsUnavailable) return null;
  if (Notifications) return Notifications;

  try {
    Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    return Notifications;
  } catch {
    notificationsUnavailable = true;
    logger.warn('expo-notifications not available on this build');
    return null;
  }
}

export async function initializeNotifications(): Promise<boolean> {
  const mod = await loadNotifications();
  if (!mod) return false;

  const asked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
  if (asked === 'granted') return true;

  const { status: existing } = await mod.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await mod.requestPermissionsAsync();
    finalStatus = status;
  }

  await AsyncStorage.setItem(PERMISSION_ASKED_KEY, finalStatus);
  return finalStatus === 'granted';
}

export async function scheduleLocalNotification(params: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  secondsFromNow?: number;
}): Promise<void> {
  const mod = await loadNotifications();
  if (!mod) return;

  const granted = await initializeNotifications();
  if (!granted) return;

  await mod.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      sound: true,
    },
    trigger: params.secondsFromNow
      ? { type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: params.secondsFromNow }
      : null,
  });
}

export async function notifyCareTeamDigest(params: {
  urgentTasks: number;
  highAlerts: number;
  dueVaccinations?: number;
}): Promise<void> {
  const digest = JSON.stringify(params);
  const last = await AsyncStorage.getItem(LAST_ALERT_DIGEST_KEY);
  if (last === digest) return;

  const parts: string[] = [];
  if (params.urgentTasks > 0) {
    parts.push(`${params.urgentTasks} urgent task${params.urgentTasks === 1 ? '' : 's'}`);
  }
  if (params.highAlerts > 0) {
    parts.push(`${params.highAlerts} priority alert${params.highAlerts === 1 ? '' : 's'}`);
  }
  if (params.dueVaccinations && params.dueVaccinations > 0) {
    parts.push(`${params.dueVaccinations} vaccination${params.dueVaccinations === 1 ? '' : 's'} due`);
  }

  if (!parts.length) return;

  await scheduleLocalNotification({
    title: 'VitaWeave - Action needed',
    body: parts.join(' · '),
    data: { type: 'care_digest' },
  });

  await AsyncStorage.setItem(LAST_ALERT_DIGEST_KEY, digest);
}

export async function notifyAppointmentReminder(patientName: string, timeLabel: string): Promise<void> {
  await scheduleLocalNotification({
    title: 'Upcoming consultation',
    body: `${patientName} at ${timeLabel}`,
    data: { type: 'appointment' },
    secondsFromNow: 1,
  });
}
