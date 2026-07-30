/**
 * Normalisation des modes de paiement FayClick.
 *
 * ⚠️ SYNCHRO CROISÉE AVEC POSTGRESQL — ce module est le MIROIR TypeScript de la
 * normalisation appliquée par la fonction `get_rapport_encaissements()`.
 * Toute branche ajoutée ici doit l'être aussi côté SQL (et réciproquement),
 * sinon les agrégats serveur et les agrégats client de repli divergent.
 *
 * Pourquoi une normalisation est nécessaire : la colonne
 * `recus_paiement.methode_paiement` est alimentée par plusieurs écrivains qui
 * n'utilisent pas la même convention.
 * - Le front écrit des slugs minuscules via `convertWalletType()`
 *   (services/recu.service.ts) : `orange-money`, `wave`, `free-money`, `espèces`.
 * - Des écritures côté serveur produisent des sigles majuscules : `OM`, `WAVE`,
 *   `CASH`, `FREE`.
 * Les deux familles désignent les mêmes moyens de paiement et doivent être
 * agrégées ensemble.
 */

import {
  Banknote,
  Smartphone,
  Waves,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/** Modes de paiement après normalisation. `AUTRES` est le bucket de repli. */
export const MODES_PAIEMENT_NORMALISES = ['CASH', 'OM', 'WAVE', 'FREE', 'AUTRES'] as const;

export type ModePaiementNormalise = (typeof MODES_PAIEMENT_NORMALISES)[number];

/**
 * Modes toujours affichés, même avec un compteur à zéro : l'utilisateur doit
 * pouvoir constater qu'un wallet n'a rien encaissé, pas voir sa carte disparaître.
 * `AUTRES` n'est affiché que s'il est non nul (c'est un bucket legacy).
 */
export const MODES_PAIEMENT_PRINCIPAUX = ['CASH', 'OM', 'WAVE', 'FREE'] as const;

/**
 * Table de correspondance appliquée après canonisation de la chaîne d'entrée
 * (accents retirés, majuscules, séparateurs `_`/espace ramenés à `-`).
 */
const CORRESPONDANCES: Record<string, ModePaiementNormalise> = {
  // Espèces
  CASH: 'CASH',
  ESPECES: 'CASH',
  ESPECE: 'CASH',
  LIQUIDE: 'CASH',
  // Orange Money
  OM: 'OM',
  'ORANGE-MONEY': 'OM',
  ORANGEMONEY: 'OM',
  ORANGE: 'OM',
  OFMS: 'OM',
  // Wave
  WAVE: 'WAVE',
  'WAVE-MONEY': 'WAVE',
  // Free Money
  FREE: 'FREE',
  'FREE-MONEY': 'FREE',
  FREEMONEY: 'FREE',
};

/**
 * Canonise une chaîne avant correspondance : retire les accents (`espèces` →
 * `ESPECES`), passe en majuscules, et ramène `_`, espaces et séparateurs
 * multiples à un `-` unique (`ORANGE MONEY` et `ORANGE_MONEY` → `ORANGE-MONEY`).
 */
function canoniser(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Normalise un mode de paiement brut vers l'un des cinq modes canoniques.
 *
 * Toute valeur inconnue, nulle ou vide retombe sur `AUTRES` — jamais d'exception,
 * ce module est appelé en boucle sur des données de production hétérogènes.
 *
 * @example normalizeMethodePaiement('orange-money') → 'OM'
 * @example normalizeMethodePaiement('espèces')      → 'CASH'
 * @example normalizeMethodePaiement('OM')           → 'OM'
 * @example normalizeMethodePaiement(null)           → 'AUTRES'
 */
export function normalizeMethodePaiement(
  raw: string | null | undefined
): ModePaiementNormalise {
  if (!raw || typeof raw !== 'string') return 'AUTRES';

  const canonique = canoniser(raw);
  if (!canonique) return 'AUTRES';

  return CORRESPONDANCES[canonique] ?? 'AUTRES';
}

/** Métadonnées d'affichage d'un mode de paiement. */
export interface ModePaiementMeta {
  /** Clé i18n RELATIVE au namespace `paymentReport` (ex. `modes.om`). */
  labelKey: string;
  /** Icône lucide-react associée. */
  icon: LucideIcon;
  /** Dégradé Tailwind de la pastille d'icône. */
  gradient: string;
  /** Dégradé Tailwind du fond de carte. */
  bgGradient: string;
  /** Couleur hexadécimale, pour les documents HTML imprimés (pas de Tailwind). */
  hex: string;
}

/**
 * Charte visuelle par mode, alignée sur les couleurs déjà utilisées dans
 * l'application (Orange Money orange, Wave bleu, Free vert, espèces gris).
 */
export const MODES_PAIEMENT_META: Record<ModePaiementNormalise, ModePaiementMeta> = {
  CASH: {
    labelKey: 'modes.cash',
    icon: Banknote,
    gradient: 'from-slate-500 to-slate-600',
    bgGradient: 'from-slate-50 to-slate-100',
    hex: '#475569',
  },
  OM: {
    labelKey: 'modes.om',
    icon: Smartphone,
    gradient: 'from-orange-500 to-orange-600',
    bgGradient: 'from-orange-50 to-orange-100',
    hex: '#f97316',
  },
  WAVE: {
    labelKey: 'modes.wave',
    icon: Waves,
    gradient: 'from-blue-500 to-blue-600',
    bgGradient: 'from-blue-50 to-blue-100',
    hex: '#3b82f6',
  },
  FREE: {
    labelKey: 'modes.free',
    icon: Smartphone,
    gradient: 'from-green-500 to-green-600',
    bgGradient: 'from-green-50 to-green-100',
    hex: '#22c55e',
  },
  AUTRES: {
    labelKey: 'modes.other',
    icon: Wallet,
    gradient: 'from-purple-500 to-purple-600',
    bgGradient: 'from-purple-50 to-purple-100',
    hex: '#a855f7',
  },
};
