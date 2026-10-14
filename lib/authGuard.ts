import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from './supabase';
import { getCurrentUser, getUserProfile, ensureUserProfile } from './auth';
import { isDevModeEnabled } from './devMode';
import { normalizeRole, type UserRole } from './roles';
import {
  persistSession,
  clearSessionStorage,
  getStoredUserId as readStoredUserId,
  getStoredRole,
  getSecureSession,
} from './sessionStorage';
import { flushSync, isOnline, writeLocalFirst } from './sync/SyncService';
import { nowIso } from './repositories/base';

export { persistSession };

export async function clearSession(): Promise<void> {
  await clearSessionStorage();
  try {
    if (await isOnline()) {
      await supabase.auth.signOut();
    }
  } catch {
    // offline sign-out is local-only
  }
}

export async function verifyRoleAccess(requiredRole: UserRole): Promise<{
  allowed: boolean;
  userId?: string;
  reason?: string;
}> {
  const online = await isOnline();
  const user = online ? await getCurrentUser() : null;

  if (!user) {
    const secure = await getSecureSession();
    if (secure && secure.role === requiredRole) {
      await persistSession(secure.role, secure.userId, {
        email: secure.email,
        name: secure.name,
      });
      return { allowed: true, userId: secure.userId };
    }

    if (isDevModeEnabled()) {
      const storedRole = await getStoredRole();
      const storedId = await readStoredUserId();
      if (storedRole === requiredRole) {
        return { allowed: true, userId: storedId ?? undefined };
      }
    }
    return { allowed: false, reason: 'not_authenticated' };
  }

  try {
    await supabase.auth.refreshSession();
    void flushSync();
  } catch {
    // ignore
  }

  let { data: profile, error } = await getUserProfile(user.id);
  if (error || !profile) {
    const repaired = await ensureUserProfile(user, requiredRole);
    profile = repaired.data;
    error = repaired.error;
  }

  if (error || !profile) {
    const secure = await getSecureSession();
    if (secure && secure.role === requiredRole && secure.userId === user.id) {
      return { allowed: true, userId: user.id };
    }
    return { allowed: false, reason: 'profile_missing' };
  }

  const role = normalizeRole(profile.role);
  if (role !== requiredRole) {
    return { allowed: false, reason: 'role_mismatch', userId: user.id };
  }

  await persistSession(role, user.id, {
    email: user.email,
    name: profile.name,
  });

  await writeLocalFirst('profiles_local', {
    id: user.id,
    email: user.email ?? null,
    name: profile.name,
    role,
    updated_at: nowIso(),
    created_at: nowIso(),
  }).catch(() => undefined);

  return { allowed: true, userId: user.id };
}

export function useRoleGuard(requiredRole: UserRole) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await verifyRoleAccess(requiredRole);
      if (cancelled) return;

      if (!result.allowed) {
        if (result.reason === 'role_mismatch') {
          await clearSession();
        }
        router.replace('/login');
        return;
      }

      setUserId(result.userId);
      setIsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [requiredRole, router]);

  return { isReady, userId };
}

export async function getStoredUserId(): Promise<string | null> {
  const fromStorage = await readStoredUserId();
  if (fromStorage) return fromStorage;

  const user = await getCurrentUser();
  return user?.id ?? null;
}
