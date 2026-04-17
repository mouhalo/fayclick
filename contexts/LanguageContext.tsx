'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Locale = 'fr' | 'en' | 'wo';

const SUPPORTED_LOCALES: readonly Locale[] = ['fr', 'en', 'wo'] as const;

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'fr';
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('wo')) return 'wo';
  if (browserLang.startsWith('fr')) return 'fr';
  return 'en';
}

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    const savedLocale = localStorage.getItem('fayclick-locale');

    if (isLocale(savedLocale)) {
      setLocaleState(savedLocale);
      document.documentElement.lang = savedLocale;
    } else {
      const detected = detectBrowserLocale();
      setLocaleState(detected);
      localStorage.setItem('fayclick-locale', detected);
      document.documentElement.lang = detected;
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('fayclick-locale', newLocale);
    document.documentElement.lang = newLocale;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
