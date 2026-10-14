/**
 * Demo / skip-login only outside production builds.
 * Production always returns false - EXPO_PUBLIC_DEV_MODE cannot re-enable it.
 */
export function isDevModeEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  if (process.env.EXPO_PUBLIC_DEV_MODE === 'false') {
    return false;
  }
  if (process.env.EXPO_PUBLIC_DEV_MODE === 'true') {
    return true;
  }
  return typeof __DEV__ !== 'undefined' && __DEV__;
}
