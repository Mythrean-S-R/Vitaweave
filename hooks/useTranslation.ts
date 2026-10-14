import { useCallback, useEffect, useState } from 'react';
import { getLocale, loadStoredLocale, setLocale, setLocaleFromProfile, t, type AppLocale } from '../lib/i18n';

export function useTranslation(profileLanguage?: string | null) {
  const [locale, setLocaleState] = useState<AppLocale>(getLocale());

  useEffect(() => {
    (async () => {
      await loadStoredLocale();
      if (profileLanguage) {
        const next = await setLocaleFromProfile(profileLanguage);
        setLocaleState(next);
      } else {
        setLocaleState(getLocale());
      }
    })();
  }, [profileLanguage]);

  const translate = useCallback((key: string, params?: Record<string, string | number>) => t(key, params), [locale]);

  const changeLocale = useCallback(async (next: AppLocale) => {
    await setLocale(next);
    setLocaleState(next);
  }, []);

  return { t: translate, locale, changeLocale };
}
