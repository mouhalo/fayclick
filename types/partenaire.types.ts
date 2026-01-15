/**
 * Types TypeScript pour le Dashboard Partenaire FayClick
 *
 * Fonctions PostgreSQL associées:
 * - get_partenaire_by_user(id_utilisateur)
 * - get_partenaire_stats(id_partenaire)
 * - get_partenaire_structures(id_partenaire, limit, offset, search, type, statut)
 * - get_partenaire_detail_structure(id_partenaire, id_structure)
 */

// ========================================
// Informations Partenaire
// ========================================

export interface PartenaireDetails {
  id_partenaire: number;
  nom_partenaire: string;
  code_promo: string;
  commission_pct: number;
  telephone: string;
  email: string | null;
  adresse: string | null;
  actif: boolean;
  valide_jusqua: string;
  date_creation?: string;
  // Ces champs peuvent être calculés côté frontend si non fournis par PostgreSQL
  jours_restants?: number;
  est_expire?: boolean;
}

export interface PartenaireByUserResponse {
  success: boolean;
  partenaire?: PartenaireDetails;  // La fonction PostgreSQL retourne "partenaire"
  message?: string;
}

// ========================================
// Statistiques Partenaire (Dashboard)
// ========================================

export interface PartenaireStats {
  code_promo?: string;
  structures: {
    total: number;
    actives: number;
  };
  finances: {
    chiffre_affaires_total: number;
    chiffre_affaires_mois: number;
    total_factures: number;
  };
  abonnements: {
    actifs: number;
    expires: number;
  };
}

// La fonction PostgreSQL retourne directement les stats (pas dans un champ "data")
export interface PartenaireStatsResponse extends PartenaireStats {
  success: boolean;
  message?: string;
}

// ========================================
// Liste Structures Partenaire
// ========================================

// Structure retournée par get_partenaire_structures
export interface PartenaireStructureItem {
  id_structure: number;
  nom_structure: string;
  type_structure: string;
  statut_abonnement: string;
  fin_abonnement: string | null;
  nb_factures: number;
  chiffre_affaires: number;
  nb_produits: number;          // Nombre de produits de la structure
  revenu_partenaire: number;    // Revenu partenaire pour cette structure (commission_pct * 3000)
}

export interface PartenaireListStructuresParams {
  limit?: number;
  offset?: number;
  search?: string;
  type_structure?: string;
  statut_abonnement?: string;
}

// La fonction PostgreSQL retourne directement au niveau racine
export interface PartenaireListStructuresResponse {
  success: boolean;
  total?: number;
  limit?: number;
  offset?: number;
  commission_pct?: number;           // Commission du partenaire (ex: 33)
  revenu_total_partenaire?: number;  // Revenu total (commission * 3000 * nb_structures)
  structures?: PartenaireStructureItem[];
  message?: string;
}

// ========================================
// Détail Structure (optionnel)
// ========================================

export interface PartenaireStructureDetail {
  structure: {
    id_structure: number;
    nom_structure: string;
    type_structure: string;
    telephone: string;
    email: string;
    adresse: string;
    logo: string | null;
    cachet: string | null;
    date_creation: string;
    actif: boolean;
  };
  proprietaire: {
    nom: string;
    telephone: string;
    email: string;
  };
  abonnement: {
    statut: string;
    type: string | null;
    date_debut: string | null;
    date_fin: string | null;
    jours_restants: number;
    montant: number;
  };
  stats: {
    nombre_produits: number;
    nombre_clients: number;
    nombre_factures: number;
    chiffre_affaire_total: number;
    chiffre_affaire_mois: number;
  };
}

export interface PartenaireDetailStructureResponse {
  success: boolean;
  data?: PartenaireStructureDetail;
  message?: string;
}

// ========================================
// État Auth Partenaire
// ========================================

export interface PartenaireAuthState {
  isPartenaire: boolean;
  partenaire: PartenaireDetails | null;
}

// ========================================
// Types de filtres
// ========================================

export const PARTENAIRE_TYPE_STRUCTURE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'COMMERCIALE', label: 'Commerciale' },
  { value: 'SCOLAIRE', label: 'Scolaire' },
  { value: 'IMMOBILIER', label: 'Immobilier' },
  { value: 'PRESTATAIRE DE SERVICES', label: 'Prestataire' },
] as const;

export const PARTENAIRE_STATUT_ABONNEMENT_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'ACTIF', label: 'Abonnement actif' },
  { value: 'EXPIRE', label: 'Abonnement expiré' },
  { value: 'SANS_ABONNEMENT', label: 'Sans abonnement' },
] as const;

// ========================================
// Statistiques Ventes Partenaire
// ========================================

export interface PartenaireStatsVentesPeriode {
  annee: number;
  mois: number | null;
  label: string;
  date_debut: string;
  date_fin: string;
}

export interface PartenaireStatsVentesResume {
  nombre_produits_distincts: number;
  nombre_ventes: number;
  quantite_totale_vendue: number;
  chiffre_affaire_total: number;
  cout_total: number;
  marge_totale: number;
  taux_marge_moyen: number;
  prix_moyen_vente: number;
  panier_moyen: number;
  nombre_factures: number;
  nombre_structures_actives: number;
}

export interface PartenaireStatsVentesCategorie {
  categorie: string;
  nombre_produits: number;
  nombre_ventes: number;
  quantite_vendue: number;
  chiffre_affaire: number;
  marge_totale: number;
  taux_marge: number;
  part_ca: number;
}

export interface PartenaireStatsVentesStructure {
  id_structure: number;
  nom_structure: string;
  type_structure: string;
  nombre_produits: number;
  nombre_ventes: number;
  quantite_vendue: number;
  chiffre_affaire: number;
  marge_totale: number;
  taux_marge: number;
}

export interface PartenaireStatsVentesProduit {
  id_produit: number;
  nom_produit: string;
  categorie: string;
  nombre_structures: number;
  nombre_ventes: number;
  quantite_vendue: number;
  prix_moyen: number;
  chiffre_affaire: number;
  marge_totale: number;
  taux_marge: number;
}

export interface PartenaireStatsVentesEvolution {
  // Mode annuel
  mois?: number;
  label?: string;
  // Mode mensuel
  jour?: number;
  date?: string;
  // Données communes
  quantite_vendue: number;
  chiffre_affaire: number;
  marge: number;
  nombre_ventes: number;
}

export interface PartenaireStatsVentes {
  code_promo?: string;
  periode: PartenaireStatsVentesPeriode;
  resume_global: PartenaireStatsVentesResume;
  par_categorie: PartenaireStatsVentesCategorie[];
  par_structure: PartenaireStatsVentesStructure[];
  top_produits: PartenaireStatsVentesProduit[];
  evolution: PartenaireStatsVentesEvolution[];
}

export interface PartenaireStatsVentesResponse extends PartenaireStatsVentes {
  success: boolean;
  message?: string;
}

export interface PartenaireStatsVentesParams {
  annee?: number;
  mois?: number | null;
  limit_top?: number;
}
