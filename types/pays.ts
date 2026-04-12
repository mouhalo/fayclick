/**
 * Liste des pays CEDEAO + Maghreb supportés par FayClick V2.
 * Source de vérité : table `pays` PostgreSQL — dupliqué côté frontend
 * pour perfs (pas d'appel DB au load) et synchronisé manuellement
 * lors des mises à jour DBA.
 *
 * Règle routage OTP : `code_iso === 'SN'` → SMS | sinon → Email Gmail strict
 */

export interface Pays {
  code_iso: string;            // ex: 'SN' (ISO-3166-1 alpha-2)
  nom_fr: string;              // ex: 'Sénégal'
  indicatif_tel: string;       // ex: '+221'
  devise_code: string;         // ex: 'XOF'
  devise_symbole: string;      // ex: 'FCFA'
  sms_supporte: boolean;       // true pour SN au MVP, false ailleurs
  emoji_drapeau: string;       // ex: '🇸🇳'
  ordre_affichage: number;     // Pour tri UI (SN = 1)
  actif: boolean;              // Pays activé au MVP
}

/**
 * Liste des 17 pays du MVP CEDEAO + Maghreb.
 * Identique à la table DB (voir 01-database.md §1.3).
 */
export const PAYS_LIST: readonly Pays[] = [
  // Sénégal (défaut, SMS actif)
  { code_iso: 'SN', nom_fr: 'Sénégal',        indicatif_tel: '+221', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: true,  emoji_drapeau: '🇸🇳', ordre_affichage: 1,  actif: true },

  // UEMOA (FCFA, pas de SMS au MVP)
  { code_iso: 'CI', nom_fr: "Côte d'Ivoire",  indicatif_tel: '+225', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇨🇮', ordre_affichage: 2,  actif: true },
  { code_iso: 'ML', nom_fr: 'Mali',           indicatif_tel: '+223', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇲🇱', ordre_affichage: 3,  actif: true },
  { code_iso: 'BF', nom_fr: 'Burkina Faso',   indicatif_tel: '+226', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇧🇫', ordre_affichage: 4,  actif: true },
  { code_iso: 'TG', nom_fr: 'Togo',           indicatif_tel: '+228', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇹🇬', ordre_affichage: 5,  actif: true },
  { code_iso: 'BJ', nom_fr: 'Bénin',          indicatif_tel: '+229', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇧🇯', ordre_affichage: 6,  actif: true },
  { code_iso: 'NE', nom_fr: 'Niger',          indicatif_tel: '+227', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇳🇪', ordre_affichage: 7,  actif: true },
  { code_iso: 'GW', nom_fr: 'Guinée-Bissau',  indicatif_tel: '+245', devise_code: 'XOF', devise_symbole: 'FCFA', sms_supporte: false, emoji_drapeau: '🇬🇼', ordre_affichage: 8,  actif: true },

  // CEDEAO hors UEMOA
  { code_iso: 'GN', nom_fr: 'Guinée Conakry', indicatif_tel: '+224', devise_code: 'GNF', devise_symbole: 'GNF',  sms_supporte: false, emoji_drapeau: '🇬🇳', ordre_affichage: 9,  actif: true },
  { code_iso: 'SL', nom_fr: 'Sierra Leone',   indicatif_tel: '+232', devise_code: 'SLL', devise_symbole: 'SLL',  sms_supporte: false, emoji_drapeau: '🇸🇱', ordre_affichage: 10, actif: true },
  { code_iso: 'LR', nom_fr: 'Liberia',        indicatif_tel: '+231', devise_code: 'LRD', devise_symbole: 'LRD',  sms_supporte: false, emoji_drapeau: '🇱🇷', ordre_affichage: 11, actif: true },
  { code_iso: 'GH', nom_fr: 'Ghana',          indicatif_tel: '+233', devise_code: 'GHS', devise_symbole: 'GHS',  sms_supporte: false, emoji_drapeau: '🇬🇭', ordre_affichage: 12, actif: true },
  { code_iso: 'NG', nom_fr: 'Nigeria',        indicatif_tel: '+234', devise_code: 'NGN', devise_symbole: 'NGN',  sms_supporte: false, emoji_drapeau: '🇳🇬', ordre_affichage: 13, actif: true },
  { code_iso: 'CV', nom_fr: 'Cap-Vert',       indicatif_tel: '+238', devise_code: 'CVE', devise_symbole: 'CVE',  sms_supporte: false, emoji_drapeau: '🇨🇻', ordre_affichage: 14, actif: true },

  // Maghreb
  { code_iso: 'MA', nom_fr: 'Maroc',          indicatif_tel: '+212', devise_code: 'MAD', devise_symbole: 'MAD',  sms_supporte: false, emoji_drapeau: '🇲🇦', ordre_affichage: 15, actif: true },
  { code_iso: 'DZ', nom_fr: 'Algérie',        indicatif_tel: '+213', devise_code: 'DZD', devise_symbole: 'DZD',  sms_supporte: false, emoji_drapeau: '🇩🇿', ordre_affichage: 16, actif: true },
  { code_iso: 'TN', nom_fr: 'Tunisie',        indicatif_tel: '+216', devise_code: 'TND', devise_symbole: 'TND',  sms_supporte: false, emoji_drapeau: '🇹🇳', ordre_affichage: 17, actif: true },
] as const;

export const PAYS_DEFAULT_CODE = 'SN';

/**
 * Longueur attendue du numéro de téléphone (sans indicatif, sans 0 initial)
 * pour chaque pays supporté.
 */
export const PHONE_LENGTH_BY_PAYS: Record<string, number> = {
  SN: 9,
  CI: 10,
  ML: 8,
  BF: 8,
  TG: 8,
  BJ: 8,
  NE: 8,
  GW: 9,
  GN: 9,
  SL: 8,
  LR: 8,
  GH: 9,
  NG: 10,
  CV: 7,
  MA: 9,
  DZ: 9,
  TN: 8,
};

/**
 * Récupère le pays correspondant au code ISO donné.
 * @param code - Code ISO alpha-2 (case-insensitive)
 */
export function getPaysByCode(code: string): Pays | undefined {
  if (!code) return undefined;
  return PAYS_LIST.find(p => p.code_iso === code.toUpperCase());
}

/**
 * Indique si le pays utilise le canal SMS pour OTP.
 * Au MVP, seul le Sénégal est SMS ; tous les autres passent par Email Gmail.
 */
export function isSmsPays(code: string): boolean {
  return (code || '').toUpperCase() === 'SN';
}

/**
 * Valide la longueur d'un numéro de téléphone pour le pays donné.
 * @param phone - Numéro de téléphone (chiffres uniquement ou libre, sera nettoyé)
 * @param code - Code ISO alpha-2 du pays
 * @returns true si la longueur correspond à celle attendue pour ce pays
 */
export function validatePhoneForPays(phone: string, code: string): boolean {
  if (!phone || !code) return false;
  const cleaned = phone.replace(/\D/g, '');
  const expected = PHONE_LENGTH_BY_PAYS[code.toUpperCase()];
  if (!expected) return false;
  return cleaned.length === expected;
}
