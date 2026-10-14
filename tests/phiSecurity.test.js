import { redactPhi, sanitizeForLogging } from '../lib/phiSecurity';

describe('PHI security utilities', () => {
  test('redacts email addresses', () => {
    const input = 'Contact patient at ram@example.com for follow-up';
    expect(redactPhi(input)).not.toContain('ram@example.com');
    expect(redactPhi(input)).toContain('[REDACTED_EMAIL]');
  });

  test('redacts phone numbers', () => {
    const input = 'Call +91 98765 43210 tomorrow';
    expect(redactPhi(input)).toContain('[REDACTED_PHONE]');
  });

  test('redacts UUIDs', () => {
    const input = 'Patient id 550e8400-e29b-41d4-a716-446655440000';
    expect(redactPhi(input)).toContain('[REDACTED_ID]');
  });

  test('sanitizes sensitive object keys', () => {
    const sanitized = sanitizeForLogging({
      name: 'Ram',
      password: 'secret123',
      diagnosis: 'Hypertension',
    });

    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.diagnosis).toBe('[REDACTED]');
    expect(sanitized.name).toBe('Ram');
  });
});
