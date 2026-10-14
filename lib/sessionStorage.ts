import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserRole } from './roles';
import {
  saveSecureSession,
  getSecureSession,
  clearSecureSession,
} from './auth/secureSession';

const USER_ROLE_KEY = 'user_role';
const USER_ID_KEY = 'user_id';

export async function persistSession(
  role: UserRole,
  userId?: string,
  extras?: { email?: string; name?: string; refreshTokenHint?: string }
): Promise<void> {
  await AsyncStorage.setItem(USER_ROLE_KEY, role);
  if (userId) {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
    await saveSecureSession({
      userId,
      role,
      email: extras?.email,
      name: extras?.name,
      refreshTokenHint: extras?.refreshTokenHint,
      savedAt: new Date().toISOString(),
    });
  }
}

export async function clearSessionStorage(): Promise<void> {
  await AsyncStorage.multiRemove([USER_ROLE_KEY, USER_ID_KEY]);
  await clearSecureSession();
}

export async function getStoredUserId(): Promise<string | null> {
  const fromAsync = await AsyncStorage.getItem(USER_ID_KEY);
  if (fromAsync) return fromAsync;
  const secure = await getSecureSession();
  return secure?.userId ?? null;
}

export async function getStoredRole(): Promise<string | null> {
  const fromAsync = await AsyncStorage.getItem(USER_ROLE_KEY);
  if (fromAsync) return fromAsync;
  const secure = await getSecureSession();
  return secure?.role ?? null;
}

export { getSecureSession };
