import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserRole } from '../roles';

const SESSION_KEY = 'vitaweave_secure_session_v1';

export type SecureSessionSnapshot = {
  userId: string;
  role: UserRole;
  email?: string;
  name?: string;
  refreshTokenHint?: string;
  savedAt: string;
};

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(key);
  }
}

export async function saveSecureSession(snapshot: SecureSessionSnapshot): Promise<void> {
  await setItem(SESSION_KEY, JSON.stringify(snapshot));
}

export async function getSecureSession(): Promise<SecureSessionSnapshot | null> {
  const raw = await getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SecureSessionSnapshot;
  } catch {
    return null;
  }
}

export async function clearSecureSession(): Promise<void> {
  await deleteItem(SESSION_KEY);
}
