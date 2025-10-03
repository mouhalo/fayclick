'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Locale = 'fr' | 'en';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    // Récupérer la langue depuis localStorage ou détecter depuis le navigateur
    const savedLocale = localStorage.getItem('fayclick-locale') as Locale | null;

    if (savedLocale && (savedLocale === 'fr' || savedLocale === 'en')) {
      setLocaleState(savedLocale);
      document.documentElement.lang = savedLocale;
    } else {
      // Détecter la langue du navigateur
      const browserLang = navigator.language.toLowerCase();
      const detectedLocale = browserLang.startsWith('fr') ? 'fr' : 'en';
      setLocaleState(detectedLocale);
      localStorage.setItem('fayclick-locale', detectedLocale);
      document.documentElement.lang = detectedLocale;
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
