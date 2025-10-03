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

    // Support pour les clés imbriquées comme "step1.title"
    const keys = (key as string).split('.');
    let translation: any = namespaceMessages;

    for (const k of keys) {
      if (translation && typeof translation === 'object') {
        translation = translation[k];
      } else {
        translation = undefined;
        break;
      }
    }

    if (!translation || typeof translation !== 'string') {
      console.warn(`Translation key "${String(key)}" not found in namespace "${namespace}"`);
      return key as string;
    }

    // Support pour les paramètres comme {name}, {count}
    if (params) {
      translation = translation.replace(/\{(\w+)\}/g, (match: string, param: string) => {
        return params[param] !== undefined ? String(params[param]) : match;
      });
    }

    return translation;
  };

  return t;
}
