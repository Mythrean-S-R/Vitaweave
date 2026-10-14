/** Redact likely PHI/PII before logging or error reporting. */

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN =
  /(?:\+\d{1,3}[\s-]?)?(?:\d[\s-]?){9,14}\d/g;
const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'api_key',
  'apikey',
  'authorization',
  'diagnosis',
  'prescription',
  'vitals',
  'transcript',
  'ssn',
  'aadhaar',
]);

export function redactPhi(text: string): string {
  if (!text) return text;
  return text
    .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
    .replace(UUID_PATTERN, '[REDACTED_ID]')
    .replace(PHONE_PATTERN, '[REDACTED_PHONE]');
}

export function sanitizeForLogging(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[MAX_DEPTH]';
  if (value == null) return value;
  if (typeof value === 'string') return redactPhi(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogging(item, depth + 1));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizeForLogging(val, depth + 1);
      }
    }
    return result;
  }

  return String(value);
}
