import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { normalizeRole, type UserRole } from './roles';
import { persistSession, clearSessionStorage } from './sessionStorage';
import { SentryManager } from './sentry';
import { Analytics } from './analytics';
import { registerDevicePushToken } from './pushTokens';
import { logAuditEvent } from './auditLog';

export type { UserRole };

export async function signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('Sign In error:', error.message);
        return { error };
    }

    return { data };
}

export async function signUpWithEmail(
    email: string,
    password: string,
    name: string,
    role: UserRole | 'ASHA' | 'Doctor' | 'Patient'
) {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
        return { error: new Error('Invalid role') };
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                role: normalizedRole,
            },
        },
    });

    if (error) {
        console.error('Sign Up error:', error.message);
        return { error };
    }

    if (data.user && data.session) {
        const { error: profileError } = await supabase.from('profiles').upsert(
            {
                id: data.user.id,
                email,
                name,
                role: normalizedRole,
            },
            { onConflict: 'id' }
        );

        if (profileError) {
            console.error('Profile sync error:', profileError.message);
            return { error: profileError };
        }

        if (normalizedRole === 'patient') {
            const { error: patientError } = await supabase.from('patients').upsert(
                {
                    name,
                    age: 1,
                    gender: 'Not Specified',
                    condition: 'General',
                    status: 'Stable',
                    risk_level: 'Low',
                    profile_id: data.user.id,
                },
                { onConflict: 'profile_id', ignoreDuplicates: true }
            );

            if (patientError) {
                console.error('Patient record sync error:', patientError.message);
            }
        }
    }

    return { data };
}

/** Create or repair a profile row from auth metadata (handles trigger/RLS gaps). */
export async function ensureUserProfile(user: User, expectedRole?: UserRole) {
    const { data: existing } = await getUserProfile(user.id);
    if (existing) {
        return { data: existing, error: null };
    }

    const meta = user.user_metadata ?? {};
    const name =
        (meta.full_name as string | undefined) ??
        (meta.name as string | undefined) ??
        user.email?.split('@')[0] ??
        'User';
    const role =
        normalizeRole((meta.role as string | undefined) ?? expectedRole) ??
        expectedRole ??
        'patient';

    const { data, error } = await supabase
        .from('profiles')
        .upsert(
            {
                id: user.id,
                email: user.email,
                name,
                role,
            },
            { onConflict: 'id' }
        )
        .select('*')
        .single();

    if (!error && role === 'patient') {
        await supabase.from('patients').upsert(
            {
                name,
                age: 1,
                gender: 'Not Specified',
                condition: 'General',
                status: 'Stable',
                risk_level: 'Low',
                profile_id: user.id,
            },
            { onConflict: 'profile_id', ignoreDuplicates: true }
        );
    }

    return { data, error };
}

export async function completeRoleLogin(expectedRole: UserRole) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) {
        throw new Error('Authentication session not found. Please log in again.');
    }

    const user = sessionData.session.user;
    let { data: profile, error: profileError } = await getUserProfile(user.id);

    if (profileError || !profile) {
        const repaired = await ensureUserProfile(user, expectedRole);
        profile = repaired.data;
        profileError = repaired.error;
    }

    if (profileError || !profile) {
        await clearSessionStorage();
        await supabase.auth.signOut();
        throw new Error('User profile not found. Please contact support.');
    }

    const role = normalizeRole(profile.role);
    if (role !== expectedRole) {
        await clearSessionStorage();
        await supabase.auth.signOut();
        throw new Error(
            `This account is registered as ${role ?? 'unknown'}. Please use the correct portal.`
        );
    }

    await persistSession(role, user.id, {
      email: user.email,
      name: profile.name,
    });

    registerDevicePushToken(user.id).catch(() => undefined);
    logAuditEvent({ action: 'login', resourceType: 'session', resourceId: user.id }).catch(() => undefined);

    SentryManager.setUser({
      id: user.id,
      email: user.email,
      username: profile.name,
    });
    Analytics.trackAuth('login', role);

    return { user, profile, role };
}

export async function signOutUser() {
    SentryManager.clearUser();
    Analytics.trackAuth('logout');
    await clearSessionStorage();
    await supabase.auth.signOut();
}

export async function signOut() {
    await clearSessionStorage();
    await supabase.auth.signOut();
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getUserProfile(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    return { data, error };
}

export const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
    asha: { email: 'asha@vitaweave.test', pass: 'vitaweave123' },
    doctor: { email: 'doctor@vitaweave.test', pass: 'vitaweave123' },
    patient: { email: 'patient@vitaweave.test', pass: 'vitaweave123' },
    admin: { email: 'doctor@vitaweave.test', pass: 'vitaweave123' },
};

export async function loginDemoRole(role: UserRole): Promise<void> {
    const cred = DEMO_CREDENTIALS[role];
    if (cred) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: cred.email,
                password: cred.pass,
            });
            if (!error && data.user) {
                await persistSession(role, data.user.id, {
                    email: cred.email,
                    name: data.user.user_metadata?.full_name ?? role.toUpperCase(),
                });
                return;
            }
        } catch {
            // offline fallback
        }
    }
    await persistSession(role);
}
