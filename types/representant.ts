/**
 * Types pour le module Réseau Distribution & Représentants (Stage A — settings uniquement)
 *
 * Représentant = utilisateur de profil REPRESENTANT rattaché à une structure
 * `compte_distributeur=true`. Vend sur le terrain avec un stock affecté et
 * des prix imposés par l'admin (affectation stock = Stage B, hors scope ici).
 *
 * Fonctions PG sous-jacentes (signatures PROD réconciliées) :
 *   - get_representants_structure(pid_structure, pactifs_seul)
 *   - create_representant(...) / modifier_representant(...)
 *   - suspendre_representant(id_structure, id_representant, id_admin)
 *   - reactiver_representant(id_structure, id_representant, id_admin)
 *   - reinitialiser_pwd_representant_auto(id_structure, id_representant, id_admin)
 *   - get_localites_disponibles()
 *
 * Cf. docs/superpowers/plans/2026-07-01-representants-stage-a.md
 */

/**
 * Mode d'encaissement d'un représentant.
 * - WALLET_STRUCTURE : les paiements wallet (OM/WAVE/FREE) vont au KALPE de la structure
 * - LIBRE : le rep encaisse en CASH/wallet manuel, doit reverser à l'admin
 */
export type ModeEncaissementRep = 'WALLET_STRUCTURE' | 'LIBRE';

/**
 * Localité rattachée à un représentant (FK localite → commune → departement)
 */
export interface LocaliteRep {
  id_localite: number;
  nom_localite: string;
  nom_commune?: string;
  nom_departement?: string;
  nom_region?: string;
}

/**
 * Données complètes d'un représentant retournées par get_representants_structure()
 */
export interface RepresentantData {
  /** PK utilisateur représentant */
  id_representant: number;
  /** Username de connexion */
  username: string;
  /** Login (email généré auto, comme caissier) */
  login?: string;
  /** Téléphone principal (login) */
  telephone: string;
  /** Téléphone terrain (différent du login, pour contact direct) */
  telephone_terrain?: string;
  /** Nom du représentant (affichage reçus) */
  nom_rep?: string;
  /** Prénom du représentant */
  prenom_rep?: string;
  /** Email du représentant */
  email_rep?: string;
  /** Localité d'affectation (obligatoire pour REPRESENTANT) */
  id_localite: number;
  localite?: LocaliteRep;
  /** Mode d'encaissement */
  mode_encaissement: ModeEncaissementRep;
  /** Compte actif (login autorisé) */
  actif: boolean;
  /** Compte actif côté réseau (suspendre/réactiver — distinct de actif) */
  actif_reseau: boolean;
  /** Mot de passe changé (post-création) */
  pwd_changed: boolean;
  /** Date création */
  user_createdat: string;
  /** Date dernière modification */
  user_updatedat: string;

  // KPIs agrégés optionnels (si la fonction PG les retourne dans la liste)
  /** Nombre de produits actuellement affectés (Stage B, en lecture seule ici) */
  nb_produits_affectes?: number;
  /** Nombre de ventes réalisées ce mois */
  nb_ventes_mois?: number;
  /** Solde dû à reverser (mode LIBRE) */
  solde_du?: number;
}

/**
 * Paramètres pour create_representant() / modifier_representant()
 *
 * id_user = 0 ou omis pour création, > 0 pour modification (= id du rep à modifier)
 */
export interface CreateRepresentantParams {
  id_user?: number; // 0 ou omis = création, > 0 = édition (ID du représentant)
  id_structure: number;
  username: string;
  telephone: string;
  telephone_terrain?: string;
  nom_rep: string;
  prenom_rep: string;
  email_rep?: string;
  id_localite: number;
  mode_encaissement: ModeEncaissementRep;
}

/**
 * Réponse standard d'une opération CRUD représentant
 */
export interface RepresentantOperationResponse {
  success: boolean;
  message: string;
  data?: {
    id?: number;
    id_representant?: number;
    username?: string;
    /** Retourné en clair à la création (password_initial) — révélation 1x côté UI */
    password_initial?: string;
    /** Retourné en clair par reinitialiser_pwd_representant_auto — révélation 1x côté UI */
    new_password?: string;
  };
}

/**
 * Réponse de get_representants_structure()
 */
export interface RepresentantsListResponse {
  success: boolean;
  message?: string;
  data: RepresentantData[];
  total?: number;
}

/**
 * Paramètres pour suspendre_representant() / reactiver_representant()
 * Signature PROD : 3 args, pas de motif.
 */
export interface ToggleRepresentantActifParams {
  id_structure: number;
  id_representant: number;
  id_admin: number;
}

/**
 * Paramètres pour reinitialiser_pwd_representant_auto()
 * Signature PROD : 3 args, génération auto (pas d'envoi SMS géré ici).
 */
export interface ResetPwdRepresentantParams {
  id_structure: number;
  id_representant: number;
  id_admin: number;
}

/**
 * Helper : badge de statut affichable pour la card
 */
export type StatutRepresentant =
  | 'ACTIF' // actif=true et actif_reseau=true
  | 'SUSPENDU' // actif_reseau=false
  | 'INACTIF' // actif=false (login impossible)
  | 'NOUVEAU'; // créé mais pwd jamais changé

export function getStatutRepresentant(rep: RepresentantData): StatutRepresentant {
  if (!rep.actif) return 'INACTIF';
  if (!rep.actif_reseau) return 'SUSPENDU';
  if (!rep.pwd_changed) return 'NOUVEAU';
  return 'ACTIF';
}
