import { useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import fr from '@/messages/fr.json';
import en from '@/messages/en.json';
import wo from '@/messages/wo.json';

const translations = { fr, en, wo } as const;

export type Locale = keyof typeof translations;
export type Namespace = keyof typeof fr;
export type TranslationKey<N extends Namespace> = keyof (typeof fr)[N];

function resolveKey(messages: any, namespace: string, key: string): string | undefined {
  const namespaceMessages = messages[namespace];
  if (!namespaceMessages) return undefined;

  const keys = key.split('.');
  let value: any = namespaceMessages;
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return undefined;
    }
  }
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, param: string) =>
    params[param] !== undefined ? String(params[param]) : match
  );
}

export function useTranslations<N extends Namespace>(namespace: N) {
  const { locale } = useLanguage();

  // Mémoïsé sur [locale, namespace] : la référence `t` ne change que si la locale
  // change. Sans cela, ajouter `t` aux deps d'un useEffect/useCallback causerait
  // une boucle infinie de re-render.
  const t = useCallback(
    (key: TranslationKey<N> | string, params?: Record<string, unknown>): string => {
      const keyStr = key as string;

      let value = resolveKey(translations[locale], namespace, keyStr);

      if (value === undefined && locale !== 'fr') {
        value = resolveKey(translations.fr, namespace, keyStr);
        if (value !== undefined && typeof window !== 'undefined') {
          console.warn(`[i18n] Missing "${namespace}.${keyStr}" in "${locale}", using FR fallback`);
        }
      }

      if (value === undefined) {
        if (typeof window !== 'undefined') {
          console.warn(`[i18n] Missing "${namespace}.${keyStr}" in all locales`);
        }
        return keyStr;
      }

      return interpolate(value, params);
    },
    [locale, namespace]
  );

  return t;
}
