import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DatabaseService } from '@services/DatabaseService';
import { t, type Language, type TranslationKey } from './index';

export type { Language };

interface I18nContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  tr: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  tr: (key) => t(key, 'en'),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    (async () => {
      try {
        const row = await DatabaseService.queryFirst<{ value: string }>(
          "SELECT value FROM user_preferences WHERE key = 'app_language'",
        );
        if (row?.value && ['en', 'hi', 'mr'].includes(row.value)) {
          setLangState(row.value as Language);
        }
      } catch {
        // Database not ready yet — will use default 'en'
      }
    })();
  }, []);

  const setLang = useCallback(async (l: Language) => {
    setLangState(l);
    await DatabaseService.execute(
      "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('app_language', ?)",
      [l],
    );
  }, []);

  const tr = useCallback((key: TranslationKey) => t(key, lang), [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, tr }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
