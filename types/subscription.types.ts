/**
 * Types TypeScript pour le système de gestion des abonnements FayClick
 * Support formules MENSUEL et ANNUEL avec paiement wallet (OM/WAVE/FREE)
 */

import { PaymentMethod } from './payment-wallet';

// ========================================
// Types de base
// ========================================

/** Types d'abonnement disponibles */
export type SubscriptionType = 'MENSUEL' | 'ANNUEL';

/** Statuts d'abonnement */
export type SubscriptionStatus = 'ACTIF' | 'EXPIRE' | 'EN_ATTENTE' | 'ANNULE';

// ========================================
// Interfaces principales
// ========================================

/**
 * Formule d'abonnement avec détails tarifaires
 */
export interface SubscriptionFormula {
  type: SubscriptionType;
  montant: number;
  description: string;
  reduction?: number; // Pour annuel : -10 FCFA/mois
  badge?: string; // Ex: "Économie", "Flexible"
  badgeColor?: string;
}

/**
 * Abonnement structure (réponse PostgreSQL)
 * Correspond au retour de add_abonnement_structure() et renouveler_abonnement()
 */
export interface Abonnement {
  id_abonnement: number;
  id_structure: number;
  type_abonnement: SubscriptionType;
  date_debut: string; // Format ISO 8601
  date_fin: string; // Format ISO 8601
  montant: number; // En FCFA
  ref_abonnement: string; // Ex: "ABO-139-20251003172246"
  numrecu: string; // Ex: "REC-139-20251003172246"
  uuid_paiement: string; // UUID du paiement wallet
  methode: Exclude<PaymentMethod, 'CASH'>; // OM, WAVE ou FREE
  statut: SubscriptionStatus;
  abonnements_annules?: number[] | null; // IDs abonnements annulés
}

/**
 * Entrée de l'historique des abonnements
 */
export interface HistoriqueAbonnement {
  id_abonnement: number;
  date_debut: string;
  date_fin: string;
  type_abonnement: SubscriptionType;
  montant: number;
  statut: SubscriptionStatus;
  ref_abonnement: string;
  numrecu: string;
  methode: Exclude<PaymentMethod, 'CASH'>;
}

/**
 * État de l'abonnement retourné par get_une_structure()
 * Contient toutes les informations de l'abonnement actuel avec jours_restants calculé par PostgreSQL
 */
export interface EtatAbonnement {
  id_abonnement: number;
  statut: SubscriptionStatus;
  type_abonnement: SubscriptionType;
  date_debut: string; // Format ISO YYYY-MM-DD
  date_fin: string; // Format ISO YYYY-MM-DD
  montant: number;
  methode: 'OM' | 'WAVE' | 'FREE';
  jours_restants: number; // Calculé directement par PostgreSQL
}

/**
 * État actuel de l'abonnement de la structure
 * Mis à jour pour utiliser les données de get_une_structure()
 */
export interface CurrentSubscriptionState {
  etat_abonnement: SubscriptionStatus;
  date_limite_abonnement: string; // Date ISO (date_fin)
  type_abonnement: SubscriptionType | null;
  jours_restants?: number; // Nouveau: directement depuis PostgreSQL
  id_abonnement?: number;
  montant?: number;
  methode?: 'OM' | 'WAVE' | 'FREE';
}

// ========================================
// Interfaces de requête/réponse API
// ========================================

/**
 * Paramètres pour calculer le montant d'un abonnement
 */
export interface CalculateMontantParams {
  type_abonnement: SubscriptionType;
  date_debut?: string; // Default: CURRENT_DATE
}

/**
 * Paramètres pour créer un abonnement
 */
export interface CreateAbonnementParams {
  id_structure: number;
  type_abonnement: SubscriptionType;
  methode: Exclude<PaymentMethod, 'CASH'>;
  date_debut?: string; // Default: CURRENT_DATE
  ref_abonnement?: string; // Auto-généré si non fourni
  numrecu?: string; // Auto-généré si non fourni
  uuid_paiement?: string; // UUID du paiement wallet (obtenu après polling)
  forcer_remplacement?: boolean; // Force remplacement si abonnement actif existe
}

/**
 * Paramètres pour renouveler un abonnement
 */
export interface RenewAbonnementParams {
  id_structure: number;
  type_abonnement: SubscriptionType;
  methode: Exclude<PaymentMethod, 'CASH'>;
  ref_abonnement?: string;
  numrecu?: string;
  uuid_paiement?: string;
}

/**
 * Paramètres pour récupérer l'historique
 */
export interface HistoriqueAbonnementParams {
  id_structure: number;
  limite?: number; // Default: 10
}

/**
 * Réponse de création/renouvellement d'abonnement
 */
export interface AbonnementResponse {
  success: boolean;
  message: string;
  data?: Abonnement;
  error?: string;
}

/**
 * Réponse de l'historique
 */
export interface HistoriqueResponse {
  success: boolean;
  data?: HistoriqueAbonnement[];
  error?: string;
}

// ========================================
// Constantes
// ========================================

/**
 * Tarification abonnements
 */
export const SUBSCRIPTION_PRICING = {
  /** Prix par jour en FCFA */
  PRIX_JOUR: 100,

  /** Réduction mensuelle pour abonnement annuel en FCFA */
  REDUCTION_ANNUELLE: 10,

  /** Montants approximatifs (calculés dynamiquement) */
  MONTANT_MENSUEL_APPROX: 3100, // Pour 31 jours
  MONTANT_ANNUEL_APPROX: 36380, // 12 mois avec -120 FCFA
} as const;

/**
 * Configuration des formules d'abonnement
 */
export const SUBSCRIPTION_FORMULAS: Record<SubscriptionType, Omit<SubscriptionFormula, 'montant'>> = {
  MENSUEL: {
    type: 'MENSUEL',
    description: 'Facturation mensuelle flexible',
    badge: 'Flexible',
    badgeColor: 'blue'
  },
  ANNUEL: {
    type: 'ANNUEL',
    description: 'Économisez 10 FCFA par mois',
    reduction: 120, // 10 FCFA × 12 mois
    badge: 'Économie -120 FCFA',
    badgeColor: 'emerald'
  }
} as const;

/**
 * Délai avant expiration pour afficher alerte (en jours)
 */
export const EXPIRATION_WARNING_DAYS = 7;

/**
 * Couleurs des badges de statut
 */
export const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  ACTIF: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  EXPIRE: 'bg-red-100 text-red-700 border-red-200',
  EN_ATTENTE: 'bg-orange-100 text-orange-700 border-orange-200',
  ANNULE: 'bg-gray-100 text-gray-700 border-gray-200'
} as const;

// ========================================
// Helpers de validation
// ========================================

/**
 * Vérifie si un abonnement est actif
 */
export function isSubscriptionActive(statut: SubscriptionStatus): boolean {
  return statut === 'ACTIF';
}

/**
 * Vérifie si un abonnement expire bientôt
 */
export function isExpiringSoon(dateLimite: string, warningDays: number = EXPIRATION_WARNING_DAYS): boolean {
  const limitDate = new Date(dateLimite);
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + warningDays);

  return limitDate <= warningDate && limitDate >= new Date();
}

/**
 * Formate une date ISO en format lisible français
 */
export function formatSubscriptionDate(dateISO: string): string {
  const date = new Date(dateISO);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Calcule le nombre de jours restants avant expiration
 */
export function getDaysRemaining(dateLimite: string): number {
  const limitDate = new Date(dateLimite);
  const today = new Date();
  const diff = limitDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
