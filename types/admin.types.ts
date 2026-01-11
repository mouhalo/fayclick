/**
 * Types TypeScript pour le Dashboard Admin FayClick
 * Basé sur les fonctions PostgreSQL:
 * - get_admin_stats_global()
 * - get_admin_list_structures(limit, offset, search, type, statut)
 * - get_admin_list_abonnements(limit, offset, statut, type, date_debut, date_fin)
 * - get_admin_stats_ventes(annee, mois, id_structure)
 * - get_admin_detail_structure(id_structure)
 */

// ========================================
// Types de base
// ========================================

export type TypeStructure = 'COMMERCIALE' | 'PRESTATAIRE DE SERVICES' | 'SCOLAIRE' | 'IMMOBILIER';
export type StatutAbonnement = 'ACTIF' | 'EXPIRE' | 'EN_ATTENTE' | 'ANNULE' | 'SANS_ABONNEMENT';
export type TypeAbonnement = 'MENSUEL' | 'ANNUEL';

// ========================================
// Réponse get_admin_stats_global()
// ========================================

export interface AdminStatsGlobal {
  structures: {
    total: number;
    actives: number;
    inactives: number;
    par_type: Record<TypeStructure, number>;
  };
  produits: {
    total: number;
    actifs: number;
    inactifs: number;
  };
  abonnements: {
    actifs: number;
    expires: number;
    en_attente: number;
    annules: number;
    total: number;
    revenus_mois_courant: number;
  };
  transactions: {
    nombre_factures: number;
    montant_total: number;
    montant_paye: number;
    montant_impaye: number;
    factures_mois_courant: number;
    montant_mois_courant: number;
  };
}

export interface AdminStatsGlobalResponse {
  success: boolean;
  data: AdminStatsGlobal;
  generated_at: string;
}

// ========================================
// Réponse get_admin_list_structures()
// ========================================

export interface AdminStructureItem {
  id_structure: number;
  code_structure: string;
  nom_structure: string;
  type_structure: TypeStructure;
  email_structure: string;
  telephone: string;
  adresse: string;
  date_creation: string;
  actif: boolean;
  logo: string;
  abonnement: {
    statut: StatutAbonnement;
    type: TypeAbonnement | null;
    date_fin: string | null;
    jours_restants: number;
  };
  stats: {
    nombre_produits: number;
    nombre_factures: number;
    chiffre_affaire: number;
  };
}

export interface AdminListStructuresResponse {
  success: boolean;
  data: {
    structures: AdminStructureItem[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      pages: number;
      current_page: number;
    };
  };
  filters_applied: {
    search: string | null;
    type_structure: TypeStructure | null;
    statut_abonnement: StatutAbonnement | null;
  };
}

// ========================================
// Réponse get_admin_list_abonnements()
// ========================================

export interface AdminAbonnementItem {
  id_abonnement: number;
  structure: {
    id_structure: number;
    nom_structure: string;
    type_structure: TypeStructure;
  };
  type_abonnement: TypeAbonnement;
  statut: StatutAbonnement;
  date_debut: string;
  date_fin: string;
  montant: number;
  methode_paiement: 'OM' | 'WAVE' | 'FREE';
  ref_abonnement: string;
  jours_restants: number;
  date_creation: string;
}

export interface AdminListAbonnementsResponse {
  success: boolean;
  data: {
    abonnements: AdminAbonnementItem[];
    resume: {
      total_actifs: number;
      total_expires: number;
      total_en_attente: number;
      revenus_periode: number;
    };
    pagination: {
      total: number;
      limit: number;
      offset: number;
      pages: number;
      current_page: number;
    };
  };
}

// ========================================
// Réponse get_admin_stats_ventes()
// ========================================

export interface AdminStatsVentes {
  periode: {
    annee: number;
    mois: number | null;
    label: string;
  };
  resume_global: {
    nombre_factures: number;
    nombre_articles_vendus: number;
    montant_total: number;
    montant_paye: number;
    montant_impaye: number;
    taux_recouvrement: number;
    panier_moyen: number;
  };
  par_type_structure: Array<{
    type_structure: TypeStructure;
    nombre_structures: number;
    nombre_factures: number;
    montant_total: number;
  }>;
  evolution_mensuelle: Array<{
    mois: number;
    label: string;
    montant: number;
    factures: number;
  }>;
  top_structures: Array<{
    id_structure: number;
    nom_structure: string;
    montant_total: number;
    nombre_factures: number;
  }>;
}

export interface AdminStatsVentesResponse {
  success: boolean;
  data: AdminStatsVentes;
}

// ========================================
// Réponse get_admin_detail_structure()
// ========================================

export interface AdminDetailStructure {
  structure: {
    id_structure: number;
    nom_structure: string;
    type_structure: TypeStructure;
    email_structure: string;
    telephone: string;
    adresse: string;
    logo: string;
    date_creation: string;
    actif: boolean;
  };
  proprietaire: {
    id_utilisateur: number;
    nom: string;
    email: string;
    telephone: string;
  };
  abonnement_actuel: {
    id_abonnement: number;
    type: TypeAbonnement;
    statut: StatutAbonnement;
    date_debut: string;
    date_fin: string;
    jours_restants: number;
    montant: number;
  } | null;
  stats: {
    nombre_produits: number;
    nombre_clients: number;
    nombre_factures_total: number;
    nombre_factures_mois: number;
    chiffre_affaire_total: number;
    chiffre_affaire_mois: number;
    montant_impaye: number;
  };
  historique_abonnements: Array<{
    id_abonnement: number;
    type: TypeAbonnement;
    statut: StatutAbonnement;
    date_debut: string;
    date_fin: string;
    montant: number;
  }>;
}

export interface AdminDetailStructureResponse {
  success: boolean;
  data: AdminDetailStructure;
}

// ========================================
// Paramètres des requêtes
// ========================================

export interface AdminListStructuresParams {
  limit?: number;
  offset?: number;
  search?: string;
  type_structure?: TypeStructure;
  statut_abonnement?: StatutAbonnement;
}

export interface AdminListAbonnementsParams {
  limit?: number;
  offset?: number;
  statut?: StatutAbonnement;
  type?: TypeAbonnement;
  date_debut?: string;
  date_fin?: string;
}

export interface AdminStatsVentesParams {
  annee?: number;
  mois?: number;
  id_structure?: number;
}

// ========================================
// Réponse get_admin_stats_produits_vendus()
// Stats globales des ventes de produits
// ========================================

export interface AdminStatsProduits {
  periode: {
    annee: number;
    mois: number | null;
    label: string;
    date_debut: string;
    date_fin: string;
  };
  resume_global: {
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
  };
  par_categorie: Array<{
    categorie: string;
    nombre_produits: number;
    nombre_ventes: number;
    quantite_vendue: number;
    chiffre_affaire: number;
    marge_totale: number;
    taux_marge: number;
    part_ca: number;
  }>;
  par_structure: Array<{
    id_structure: number;
    nom_structure: string;
    type_structure: TypeStructure;
    nombre_produits: number;
    nombre_ventes: number;
    quantite_vendue: number;
    chiffre_affaire: number;
    marge_totale: number;
    taux_marge: number;
  }>;
  top_produits: Array<{
    id_produit: number;
    nom_produit: string;
    categorie: string;
    description: string;
    nombre_structures: number;
    nombre_ventes: number;
    quantite_vendue: number;
    prix_moyen: number;
    prix_min: number;
    prix_max: number;
    chiffre_affaire: number;
    cout_total: number;
    marge_totale: number;
    taux_marge: number;
  }>;
  evolution: Array<{
    mois?: number;
    jour?: number;
    label: string;
    date?: string;
    quantite_vendue: number;
    chiffre_affaire: number;
    marge: number;
    nombre_ventes: number;
  }>;
}

export interface AdminStatsProduitsResponse {
  success: boolean;
  data: AdminStatsProduits;
  filtres_appliques: {
    annee: number;
    mois: number | null;
    id_structure: number | null;
    categorie: string | null;
    limit_top: number;
  };
  generated_at: string;
}

export interface AdminStatsProduitsParams {
  annee?: number;
  mois?: number;
  id_structure?: number;
  categorie?: string;
  limit_top?: number;
}

// ========================================
// Réponse get_admin_produits_vendus_details()
// Liste détaillée paginée des produits vendus
// ========================================

export interface AdminProduitVenduDetail {
  id_produit: number;
  nom_produit: string;
  categorie: string;
  description: string;
  structures: Array<{
    id_structure: number;
    nom_structure: string;
  }>;
  nombre_ventes: number;
  quantite_vendue: number;
  prix_moyen: number;
  chiffre_affaire: number;
  marge_totale: number;
  taux_marge: number;
}

export interface AdminProduitsVendusDetailsResponse {
  success: boolean;
  data: {
    produits: AdminProduitVenduDetail[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      pages: number;
      current_page: number;
    };
  };
  filtres_appliques: {
    annee: number;
    mois: number | null;
    id_structure: number | null;
    categorie: string | null;
    search: string | null;
    order_by: string;
    order_dir: string;
  };
}

export interface AdminProduitsVendusDetailsParams {
  limit?: number;
  offset?: number;
  annee?: number;
  mois?: number;
  id_structure?: number;
  categorie?: string;
  search?: string;
  order_by?: 'quantite' | 'ca' | 'marge' | 'nom';
  order_dir?: 'ASC' | 'DESC';
}

// ========================================
// Types pour la gestion des utilisateurs
// Fonctions: get_admin_all_utilisateurs, get_admin_detail_utilisateur, get_admin_reference_data
// ========================================

export interface AdminUtilisateur {
  id: number;
  username: string;
  login: string;
  telephone: string;
  actif: boolean;
  pwd_changed: boolean;
  date_creation: string;
  date_modification: string;
  groupe: {
    id_groupe: number;
    nom_groupe: string;
    description: string;
  };
  profil: {
    id_profil: number;
    nom_profil: string;
  };
  structure: {
    id_structure: number;
    code_structure?: string;
    nom_structure: string;
    type_structure: string;
    adresse?: string;
    mobile_om?: string;
    mobile_wave?: string;
    email?: string;
    logo?: string;
    actif: boolean;
  };
  is_admin_system: boolean;
}

export interface AdminUtilisateursStats {
  total_utilisateurs: number;
  utilisateurs_actifs: number;
  utilisateurs_inactifs: number;
  pwd_changed: number;
  pwd_not_changed: number;
  par_groupe: Record<string, number>;
  par_profil: Record<string, number>;
  par_structure: Array<{
    id_structure: number;
    nom_structure: string;
    count: number;
  }>;
  nouveaux_ce_mois: number;
}

export interface AdminAllUtilisateursResponse {
  success: boolean;
  data: {
    utilisateurs: AdminUtilisateur[];
    stats: AdminUtilisateursStats;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      pages: number;
      current_page: number;
    };
  };
  filtres_appliques: {
    search: string | null;
    id_structure: number | null;
    id_groupe: number | null;
    id_profil: number | null;
    actif: boolean | null;
    order_by: string;
    order_dir: string;
  };
  generated_at: string;
}

export interface AdminAllUtilisateursParams {
  limit?: number;
  offset?: number;
  search?: string;
  id_structure?: number;
  id_groupe?: number;
  id_profil?: number;
  actif?: boolean;
  order_by?: 'createdat' | 'username' | 'login' | 'structure';
  order_dir?: 'ASC' | 'DESC';
}

export interface AdminDetailUtilisateurResponse {
  success: boolean;
  data: {
    utilisateur: AdminUtilisateur;
    activite: {
      factures_total: number;
      factures_mois: number;
      montant_total: number;
      montant_mois: number;
      derniere_facture: string | null;
      premiere_facture: string | null;
    };
  };
}

export interface AdminReferenceData {
  groupes: Array<{
    id_groupe: number;
    nom_groupe: string;
    description: string;
  }>;
  profils: Array<{
    id_profil: number;
    nom_profil: string;
  }>;
  structures: Array<{
    id_structure: number;
    nom_structure: string;
    type_structure: string;
    actif: boolean;
  }>;
  types_structure: Array<{
    id_type: number;
    nom_type: string;
  }>;
}

export interface AdminReferenceDataResponse {
  success: boolean;
  data: AdminReferenceData;
}

// ========================================
// Types pour la gestion des Partenaires
// Fonctions: get_admin_list_partenaires, add_edit_partenaire, toggle_partenaire_actif, prolonger_partenaire
// ========================================

export interface AdminPartenaire {
  id_partenaire: number;
  nom_partenaire: string;
  telephone: string;
  email: string | null;
  adresse: string | null;
  code_promo: string;
  commission_pct: number;
  actif: boolean;
  valide_jusqua: string;
  jours_restants: number;
  est_expire: boolean;
  date_creation: string;
  stats: {
    nombre_structures: number;
    structures_actives: number;
  };
}

export interface AdminPartenairesStats {
  total_partenaires: number;
  partenaires_actifs: number;
  partenaires_expires: number;
  partenaires_inactifs: number;
  structures_parraines: number;
  structures_ce_mois: number;
}

export interface AdminListPartenairesResponse {
  success: boolean;
  data: {
    partenaires: AdminPartenaire[];
    stats: AdminPartenairesStats;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      pages: number;
      current_page: number;
    };
  };
}

export interface AdminListPartenairesParams {
  limit?: number;
  offset?: number;
  search?: string;
  actif?: boolean;
}

export interface AddEditPartenaireParams {
  nom: string;
  telephone: string;
  email?: string;
  adresse?: string;
  code_promo?: string;
  commission_pct?: number;
  valide_jusqua?: string;
  id_partenaire?: number;
}

export interface AddEditPartenaireResponse {
  success: boolean;
  message: string;
  data?: {
    id_partenaire: number;
    code_promo: string;
  };
}

export interface TogglePartenaireResponse {
  success: boolean;
  message: string;
}

export interface ProlongerPartenaireResponse {
  success: boolean;
  message: string;
  data?: {
    nouvelle_date_fin: string;
  };
}

// ========================================
// Types pour les statistiques Codes Promo
// Fonction: get_admin_stats_codes_promo
// ========================================

export interface AdminStatsCodesPromo {
  periode: {
    annee: number;
    mois: number | null;
    date_debut: string;
    date_fin: string;
  };
  resume: {
    total_inscriptions: number;
    via_partenaires: number;
    via_fayclick: number;
    taux_parrainage: number;
  };
  par_code_promo: Array<{
    code_promo: string;
    partenaire: string | null;
    nombre_structures: number;
    structures_actives: number;
  }>;
  evolution_mensuelle: Array<{
    mois: number;
    total: number;
    via_partenaires: number;
    via_fayclick: number;
  }> | null;
}

export interface AdminStatsCodesPromoResponse {
  success: boolean;
  data: AdminStatsCodesPromo;
}

export interface AdminStatsCodesPromoParams {
  annee?: number;
  mois?: number;
}

export interface ValidateCodePromoResponse {
  success: boolean;
  valid: boolean;
  message: string;
  data?: {
    id_partenaire: number;
    nom_partenaire: string;
    code_promo: string;
    commission_pct: number;
  };
}
