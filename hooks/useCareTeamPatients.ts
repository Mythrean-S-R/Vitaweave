import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getPatientsForCaregiver, listPatientsLocal } from '@/lib/api';
import { getStoredUserId } from '@/lib/authGuard';
import { resolveWithDemoFallback } from '@/lib/dataPolicy';
import { ALL_PATIENTS, type Patient } from '@/app/_constants/data';
import type { UserRole } from '@/lib/roles';
import { supabase } from '@/lib/supabase';

export function useCareTeamPatients(role: UserRole) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await getStoredUserId();
      const localPatients = await listPatientsLocal().catch(() => []);

      let live: Patient[] = [];
      if (userId) {
        live = await getPatientsForCaregiver(userId, role).catch(() => []);
      } else {
        const { getPatients } = await import('@/lib/api');
        live = await getPatients().catch(() => []);
      }

      const baseRoster = resolveWithDemoFallback(live, ALL_PATIENTS);
      const combined = [...localPatients];
      for (const p of baseRoster) {
        if (!combined.some((item) => item.id === p.id)) {
          combined.push(p);
        }
      }

      setPatients(combined.length > 0 ? combined : baseRoster);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    refresh();

    // Supabase Realtime: instantly refresh when any client inserts/updates/deletes a patient
    const channel = supabase
      .channel('public:patients:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  // Screen Focus: refresh automatically whenever user navigates back to this screen
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return { patients, loading, refresh };
}
