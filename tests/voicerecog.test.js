import { voiceRecognitionService, detectMedicalIntent } from '../lib/voiceRecognition';

describe('Voice Recognition Integration', () => {
  test('Platform support detection', () => {
    const isSupported = voiceRecognitionService.isSupported();
    expect(typeof isSupported).toBe('boolean');
  });

  test('Medical intent detection', () => {
    const intent = detectMedicalIntent('patient needs emergency help');
    expect(intent).toBe('EMERGENCY');
  });
});