import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import hi from './hi.json';
import ta from './ta.json';

export type AppLocale = 'en' | 'hi' | 'ta';

const LOCALE_STORAGE_KEY = '@vitaweave_locale';

const catalogs: Record<AppLocale, Record<string, unknown>> = { en, hi, ta };

const PROFILE_LANGUAGE_MAP: Record<string, AppLocale> = {
  English: 'en',
  english: 'en',
  en: 'en',
  Hindi: 'hi',
  'हिंदी': 'hi',
  hi: 'hi',
  Tamil: 'ta',
  'தமிழ்': 'ta',
  ta: 'ta',
};

export const LANGUAGE_OPTIONS: { value: string; locale: AppLocale; labelKey: string }[] = [
  { value: 'English', locale: 'en', labelKey: 'profile.english' },
  { value: 'Hindi', locale: 'hi', labelKey: 'profile.hindi' },
  { value: 'Tamil', locale: 'ta', labelKey: 'profile.tamil' },
];

let currentLocale: AppLocale = 'en';

function resolvePath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let node: unknown = obj;
  for (const part of parts) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function localeFromProfile(language?: string | null): AppLocale {
  if (!language) return 'en';
  return PROFILE_LANGUAGE_MAP[language] ?? 'en';
}

export function getLocale(): AppLocale {
  return currentLocale;
}

export async function loadStoredLocale(): Promise<AppLocale> {
  const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && stored in catalogs) {
    currentLocale = stored as AppLocale;
  }
  return currentLocale;
}

export async function setLocale(locale: AppLocale): Promise<void> {
  currentLocale = locale;
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export async function setLocaleFromProfile(language?: string | null): Promise<AppLocale> {
  const locale = localeFromProfile(language);
  await setLocale(locale);
  return locale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const catalog = catalogs[currentLocale];
  let text = resolvePath(catalog as Record<string, unknown>, key)
    ?? resolvePath(en as Record<string, unknown>, key)
    ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  return text;
}

export function geminiLanguageInstruction(locale: AppLocale = currentLocale): string {
  const names: Record<AppLocale, string> = {
    en: 'English',
    hi: 'Hindi (हिंदी)',
    ta: 'Tamil (தமிழ்)',
  };
  return `Respond in ${names[locale]}. Keep medical terms clear and use plain language suitable for community health workers in India.`;
}
