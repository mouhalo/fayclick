import { useLanguage } from '@/contexts/LanguageContext';
import fr from '@/messages/fr.json';
import en from '@/messages/en.json';

const translations = { fr, en };

export type Namespace = keyof typeof fr;
export type TranslationKey<N extends Namespace> = keyof typeof fr[N];

export function useTranslations<N extends Namespace>(namespace: N) {
  const { locale } = useLanguage();

  const t = (key: TranslationKey<N> | string, params?: Record<string, any>): string => {
    const messages = translations[locale];
    const namespaceMessages = messages[namespace] as any;

    if (!namespaceMessages) {
      console.warn(`Namespace "${namespace}" not found`);
      return key as string;
    }

    let translation = namespaceMessages[key];

    if (!translation) {
      console.warn(`Translation key "${String(key)}" not found in namespace "${namespace}"`);
      return key as string;
    }

    // Support pour les paramètres comme {name}, {count}
    if (params && typeof translation === 'string') {
      translation = translation.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] !== undefined ? String(params[param]) : match;
      });
    }

    return translation;
  };

  return t;
}
