/**
 * Helpers de formatage localisé (dates, nombres, devise).
 * Utilisés avec le LocaleContext pour homogénéiser l'affichage FR/EN.
 */

import type { Locale } from '@/contexts/LanguageContext';

const LOCALE_MAP: Record<Locale, string> = {
  fr: 'fr-FR',
  en: 'en-US',
};

export interface CurrencyStructure {
  devise?: string | null;
  code_devise?: string | null;
}

/**
 * Convertit notre Locale applicatif vers un BCP 47 tag (fr-FR / en-US).
 */
export function toBcp47(locale: Locale): string {
  return LOCALE_MAP[locale] ?? 'fr-FR';
}

/**
 * Formate une date selon la locale.
 * @example formatDate(new Date(), 'fr') → "14/04/2026"
 * @example formatDate(new Date(), 'en') → "4/14/2026"
 */
export function formatDate(
  date: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(toBcp47(locale), options);
}

/**
 * Formate une date+heure selon la locale.
 */
export function formatDateTime(
  date: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const merged: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  return d.toLocaleString(toBcp47(locale), merged);
}

/**
 * Formate un nombre selon la locale.
 * @example formatNumber(1234.56, 'fr') → "1 234,56"
 * @example formatNumber(1234.56, 'en') → "1,234.56"
 */
export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString(toBcp47(locale), options);
}

/**
 * Formate un montant avec devise. La devise vient des données structure.
 * Fallback : 'FCFA' si aucune devise n'est renseignée.
 * Le label est toujours suffixé (style ouest-africain), pas préfixé.
 *
 * @example formatCurrency(1500, 'fr', { devise: 'FCFA' }) → "1 500 FCFA"
 * @example formatCurrency(1500, 'en', { devise: 'XOF', code_devise: 'XOF' }) → "1,500 XOF"
 */
export function formatCurrency(
  amount: number,
  locale: Locale,
  structure?: CurrencyStructure | null,
  options?: Intl.NumberFormatOptions
): string {
  const label = structure?.devise?.trim() || structure?.code_devise?.trim() || 'FCFA';
  const value = formatNumber(amount ?? 0, locale, {
    maximumFractionDigits: 0,
    ...options,
  });
  return `${value} ${label}`;
}

/**
 * Retourne la locale BCP 47 pour Intl directe.
 */
export function getIntlLocale(locale: Locale): string {
  return toBcp47(locale);
}
