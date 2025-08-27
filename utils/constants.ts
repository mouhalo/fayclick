import { API_CONFIG } from '@/config/env';

export const WALLET_TYPES = {
  OM: 'Orange Money',
  WAVE: 'Wave Money',
  FREE_MONEY: 'Free Money'
} as const;

export const FACTURES_STATES = {
  IMPAYEE: 1,
  PAYEE: 2,
  ANNULEE: 3
} as const;

export const ACHAT_TIMEOUT = 90000; // 90 secondes
export const PAYEMENT_TIMEOUT = 120000; // 2 minutes

// Configuration des endpoints API depuis les variables d'environnement
export const API_ENDPOINTS = {
  PSQL_REQUEST: API_CONFIG.ENDPOINT,
  ORANGE_MONEY: API_CONFIG.ORANGE_ENDPOINT
} as const;

export const PHONE_OPERATORS = {
  ORANGE: ['77', '78'],
  TIGO: ['76'],
  EXPRESSO: ['70'],
  FREE: ['75']
} as const;

export const APPLICATION_NAME = 'fayclick';

// ================================
// FAYCLICK V2 - SEGMENTS D'AFFAIRES
// ================================

export const BUSINESS_SEGMENTS = {
  PRESTATAIRE: 'PRESTATAIRE DE SERVICES',
  COMMERCE: 'COMMERCIALE', 
  SCOLAIRE: 'SCOLAIRE',
  IMMOBILIER: 'IMMOBILIER'
} as const;

export const SEGMENT_COLORS = {
  [BUSINESS_SEGMENTS.PRESTATAIRE]: '#3B82F6', // Blue
  [BUSINESS_SEGMENTS.COMMERCE]: '#10B981',    // Green  
  [BUSINESS_SEGMENTS.SCOLAIRE]: '#F59E0B',    // Orange
  [BUSINESS_SEGMENTS.IMMOBILIER]: '#8B5CF6'   // Purple
} as const;

export const SEGMENT_ICONS = {
  [BUSINESS_SEGMENTS.PRESTATAIRE]: '🔧',
  [BUSINESS_SEGMENTS.COMMERCE]: '🛒', 
  [BUSINESS_SEGMENTS.SCOLAIRE]: '🎓',
  [BUSINESS_SEGMENTS.IMMOBILIER]: '🏠'
} as const;

// Types de transactions par segment
export const TRANSACTION_TYPES = {
  [BUSINESS_SEGMENTS.PRESTATAIRE]: [
    'CONSULTATION',
    'INTERVENTION', 
    'MAINTENANCE',
    'FORMATION'
  ],
  [BUSINESS_SEGMENTS.COMMERCE]: [
    'VENTE_PRODUIT',
    'COMMANDE_LIVRAISON',
    'RETOUR_REMBOURSEMENT'
  ],
  [BUSINESS_SEGMENTS.SCOLAIRE]: [
    'INSCRIPTION',
    'SCOLARITE',
    'EXAMEN',
    'ACTIVITE_EXTRA'
  ],
  [BUSINESS_SEGMENTS.IMMOBILIER]: [
    'LOCATION',
    'VENTE',
    'GESTION_SYNDIC',
    'COMMISSION'
  ]
} as const;

// États étendus pour les factures FayClick
export const FACTURE_STATUS_EXTENDED = {
  ...FACTURES_STATES,
  EN_ATTENTE_VALIDATION: 4,
  PARTIELLEMENT_PAYEE: 5,
  REMBOURSEE: 6
} as const;

// Configuration des timeouts par segment
export const SEGMENT_TIMEOUTS = {
  [BUSINESS_SEGMENTS.PRESTATAIRE]: 180000, // 3 min pour services
  [BUSINESS_SEGMENTS.COMMERCE]: 120000,    // 2 min pour commerce
  [BUSINESS_SEGMENTS.SCOLAIRE]: 90000,     // 1.5 min pour scolaire
  [BUSINESS_SEGMENTS.IMMOBILIER]: 240000   // 4 min pour immobilier
} as const;