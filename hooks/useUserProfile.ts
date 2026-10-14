import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser, getUserProfile, signOutUser } from '@/lib/auth';
import { updateProfile } from '@/lib/api';
import {
  getAshaProfileStats,
  getDoctorProfileStats,
  getPatientProfileStats,
  type AshaProfileStats,
  type DoctorProfileStats,
  type PatientProfileStats,
} from '@/lib/profileStats';
import type { UserRole } from '@/lib/roles';

export type ProfileRecord = {
  id: string;
  email?: string;
  name: string;
  role: string;
  phone?: string;
  ward?: string;
  language?: string;
  avatar_url?: string;
  level?: number;
  lives_impacted?: number;
};

type RoleStats = AshaProfileStats | DoctorProfileStats | PatientProfileStats | null;

export function useUserProfile(expectedRole: UserRole) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [stats, setStats] = useState<RoleStats>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        setProfile(null);
        setStats(null);
        return;
      }

      const { data } = await getUserProfile(user.id);
      if (data) {
        setProfile(data as ProfileRecord);

        if (expectedRole === 'asha') {
          const s = await getAshaProfileStats(user.id);
          setStats(s);
          setNotificationCount(s.pendingTasks + s.dueVaccinations);
        } else if (expectedRole === 'doctor') {
          const s = await getDoctorProfileStats(user.id);
          setStats(s);
          setNotificationCount(s.todayAppointments);
        } else if (expectedRole === 'patient') {
          const s = await getPatientProfileStats(user.id);
          setStats(s);
          setNotificationCount(s.upcomingAppointments);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [expectedRole]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveProfile = useCallback(
    async (updates: { name?: string; phone?: string; ward?: string; language?: string }) => {
      if (!profile) return { error: new Error('No profile loaded') };
      const result = await updateProfile(profile.id, updates);
      if (!result.error) {
        setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      }
      return result;
    },
    [profile]
  );

  const logout = useCallback(async () => {
    await signOutUser();
  }, []);

  return {
    loading,
    profile,
    stats,
    notificationCount,
    refresh,
    saveProfile,
    logout,
  };
}
