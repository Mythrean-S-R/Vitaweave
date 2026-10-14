import { isDevModeEnabled } from './devMode';

/**
 * Use demo seed data only when dev mode is on and live data is empty.
 * Production builds always show empty states instead of mock patients.
 */
export function resolveWithDemoFallback<T>(live: T[], demo: T[]): T[] {
  if (live.length > 0) return live;
  return isDevModeEnabled() ? demo : [];
}

export function isProductionDataMode(): boolean {
  return !isDevModeEnabled();
}
