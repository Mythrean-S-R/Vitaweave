import { useEffect, useState } from 'react';
import { getPendingSyncCount, subscribeSyncStatus } from '../lib/syncEngine';

export type SyncStatus = 'synced' | 'pending';

export function useSyncStatus(): { status: SyncStatus; pendingCount: number } {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getPendingSyncCount().then(setPendingCount);
    return subscribeSyncStatus(setPendingCount);
  }, []);

  return {
    status: pendingCount > 0 ? 'pending' : 'synced',
    pendingCount,
  };
}
