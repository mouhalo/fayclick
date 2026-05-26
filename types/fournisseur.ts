/**
 * Types pour le module de gestion des Fournisseurs (EPIC 1 — comptes prives)
 *
 * Source de verite : docs/dba/fournisseur-spec.md (v1.0 — 2026-05-25)
 * Les noms de champs refletent exactement le JSON retourne par PostgreSQL.
 *
 * Tables PostgreSQL : fournisseur, etat_bon_commande
 * Fonctions PG : create_fournisseur, edit_fournisseur, delete_fournisseur, get_list_fournisseurs
 *
 * Note Phase 1 : nb_bons_commandes = 0 (placeholder).
 * Note Phase 2 (apres patch EPIC 2) : nb_bons_commandes contiendra le COUNT reel.
 */

// Interface principale : ligne complete de la table fournisseur
export interface Fournisseur {
  id_fournisseur: number;
  id_structure: number;
  nom_fournisseur: string;
  tel_fournisseur: string | null;
  email_fournisseur: string | null;
  adresse: string | null;
  ninea: string | null;
  notes: string | null;
  actif: boolean;
  date_creation: string;          // ISO 8601 (ex: "2026-05-25T14:30:00")
  date_modification: string | null;
  // Champ calcule (jointure agregee sur bon_commande) — 0 en Phase 1
  nb_bons_commandes: number;
}

// Input pour creation
export interface CreateFournisseurInput {
  nom_fournisseur: string;
  tel_fournisseur?: string;
  email_fournisseur?: string;
  adresse?: string;
  ninea?: string;
  notes?: string;
}

// Input pour edition (tous champs optionnels — NULL = inchange cote PG via COALESCE)
export interface EditFournisseurInput {
  nom_fournisseur?: string;
  tel_fournisseur?: string;
  email_fournisseur?: string;
  adresse?: string;
  ninea?: string;
  notes?: string;
}

// Reponse de creation
export interface CreateFournisseurResponse {
  success: boolean;
  id_fournisseur?: number;
  message: string;
}

// Reponse generique edit / delete
export interface FournisseurActionResponse {
  success: boolean;
  message: string;
}

// Resume global retourne par get_list_fournisseurs
export interface FournisseurResume {
  total_fournisseurs: number;
}

// Reponse de la liste des fournisseurs
export interface FournisseurListResponse {
  success: boolean;
  fournisseurs: Fournisseur[];
  resume: FournisseurResume;
}

// Filtres cote front (recherche locale sur cache)
export interface FiltresFournisseurs {
  search?: string;
  sortBy?: 'nom' | 'date_creation' | 'nb_bons_commandes';
  sortOrder?: 'asc' | 'desc';
}
