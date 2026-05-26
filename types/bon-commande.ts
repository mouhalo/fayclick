/**
 * Types pour le module de gestion des Bons de Commande Fournisseurs (EPIC 2 — comptes prives)
 *
 * Source de verite : docs/dba/bon-commande-spec.md (v1.0 — 2026-05-25) §5.4 / §5.5
 * Les noms de champs (num_bc, *_snap, cout_revient, total_bcs, nb_brouillons...) refletent
 * exactement le JSON retourne par PostgreSQL. Divergence avec le PRD assumee.
 *
 * Tables PostgreSQL : bon_commande, bon_commande_details, bon_commande_compteur, etat_bon_commande
 * Fonctions PG : create_bon_commande, edit_bon_commande, delete_bon_commande,
 *                get_list_bons_commandes, get_bon_commande_details
 *
 * IMPORTANT :
 * - Aucun mouvement de stock automatique a la creation (reception manuelle via module Inventaire)
 * - num_bc est immuable apres creation (format : BC-{id_structure}-{YYYYMMDD}-{seq4})
 * - Snapshot dénormalisé : nom_fournisseur_snap + tel_fournisseur_snap + nom_produit_snap
 */

// =============================================================================
// STATUT + ETAT
// =============================================================================

export type BonCommandeStatut = 'BROUILLON' | 'CONFIRME' | 'LIVRE' | 'ANNULE';

// Mapping libelle -> id_etat (cohérent avec table etat_bon_commande)
export const BC_STATUT_TO_ID: Record<BonCommandeStatut, number> = {
  BROUILLON: 1,
  CONFIRME: 2,
  LIVRE: 3,
  ANNULE: 4,
};

// Mapping id_etat -> libelle
export const BC_ID_TO_STATUT: Record<number, BonCommandeStatut> = {
  1: 'BROUILLON',
  2: 'CONFIRME',
  3: 'LIVRE',
  4: 'ANNULE',
};

// =============================================================================
// ENTITE PRINCIPALE : BON DE COMMANDE (entête)
// =============================================================================

export interface BonCommande {
  id_bon_commande: number;
  id_structure: number;
  id_fournisseur: number;
  id_etat: number;                       // 1..4
  libelle_etat: BonCommandeStatut;       // BROUILLON / CONFIRME / LIVRE / ANNULE
  couleur_etat: string | null;           // slate / blue / emerald / red (depuis etat_bon_commande)
  num_bc: string;                        // Format : BC-{id_structure}-{YYYYMMDD}-{seq4}
  date_bon_commande: string;             // ISO date "YYYY-MM-DD"
  description: string | null;
  montant_net: number;                   // Montant total apres remise (>= 0)
  mt_remise: number;                     // Remise accordee (>= 0)
  nom_fournisseur_snap: string | null;   // Snapshot fournisseur au CREATE
  tel_fournisseur_snap: string | null;
  id_utilisateur: number;                // Audit trail
  nb_articles: number;                   // Calcule (count des lignes details)
  date_creation: string;                 // Timestamp ISO 8601
  date_modification: string | null;
}

// =============================================================================
// DETAIL : LIGNE ARTICLE D'UN BON DE COMMANDE
// =============================================================================

export interface BonCommandeDetail {
  id_detail: number;
  id_produit: number;                    // Pas de FK stricte (snapshot historique)
  nom_produit_snap: string;              // Snapshot produit au CREATE
  quantite: number;
  cout_revient: number;                  // Prix d'achat unitaire fige (>= 0)
  sous_total: number;                    // Calcule cote PG : quantite * cout_revient
}

// =============================================================================
// FOURNISSEUR ENRICHI (dans get_bon_commande_details)
// =============================================================================

// Informations actuelles du fournisseur retournees enrichies dans le detail BC
export interface BonCommandeFournisseurEnrichi {
  id_fournisseur: number;
  nom_fournisseur: string;
  tel_fournisseur: string | null;
  email_fournisseur: string | null;
  adresse: string | null;
  ninea: string | null;
  actif: boolean;
}

// Bon de commande enrichi avec fournisseur + articles (retour de get_bon_commande_details)
export interface BonCommandeAvecDetails extends BonCommande {
  fournisseur: BonCommandeFournisseurEnrichi;
  articles: BonCommandeDetail[];
}

// Reponse complete du detail (structure imbriquee — cf. spec DBA §5.5)
export interface BonCommandeComplete {
  success: boolean;
  bon_commande: BonCommandeAvecDetails;
  message?: string;
}

// =============================================================================
// RESUMES
// =============================================================================

// Resume d'un BC unique (utilise par les composants UI Phase 5 pour totaux locaux)
export interface BonCommandeResume {
  nb_articles: number;
  quantite_totale: number;
  montant_total: number;
}

// Resume global retourne par get_list_bons_commandes
export interface BonCommandeResumeGlobal {
  total_bcs: number;
  nb_brouillons: number;
  nb_confirmes: number;
  nb_livres: number;
  nb_annules: number;
  montant_en_attente: number;        // BROUILLON + CONFIRME
  montant_total_livre: number;       // Cumul LIVRE
}

// =============================================================================
// REPONSES API
// =============================================================================

export interface BonCommandeListResponse {
  success: boolean;
  bons_commandes: BonCommande[];
  resume: BonCommandeResumeGlobal;
}

export interface CreateBonCommandeResponse {
  success: boolean;
  id_bon_commande?: number;
  num_bc?: string;
  message: string;
}

export interface BonCommandeActionResponse {
  success: boolean;
  message: string;
}

// =============================================================================
// FILTRES UI (Phase 5)
// =============================================================================

export interface FiltresBonsCommandes {
  search?: string;                                        // num_bc, fournisseur, description
  statut?: 'TOUS' | BonCommandeStatut;
  fournisseur?: string;                                   // recherche par nom_fournisseur_snap
  dateDebut?: string;                                     // ISO date
  dateFin?: string;
  sortBy?: 'date' | 'montant' | 'fournisseur' | 'num';
  sortOrder?: 'asc' | 'desc';
}
