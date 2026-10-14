import { isRunningInExpoGo } from 'expo';
import { logger } from './logger';

export function loadNativeRtcModule(): { default: any } | null {
  try {
    if (isRunningInExpoGo()) return null;
  } catch {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-agora');
  } catch {
    logger.warn('react-native-agora not available - use an EAS dev build for full video calling');
    return null;
  }
}
