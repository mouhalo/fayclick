/**
 * Types pour le module de gestion des factures proformes
 * Tables PostgreSQL: proforma, proforma_details, etat_proforma
 */

// Statuts possibles d'une proforma
export type ProformaStatut = 'BROUILLON' | 'ACCEPTEE' | 'CONVERTIE';

// Interface principale pour une proforma
export interface Proforma {
  id_proforma: number;
  num_proforma: string;
  id_structure: number;
  date_proforma: string;
  tel_client: string;
  nom_client: string;
  description: string;
  montant: number;
  mt_remise: number;
  montant_net: number;
  id_etat: number;
  libelle_etat: ProformaStatut;
  id_facture_liee: number | null;
  nb_articles: number;
  id_utilisateur: number;
  date_creation: string;
  date_modification: string;
}

// Interface pour les details d'une proforma (articles)
export interface ProformaDetail {
  id_detail: number;
  id_proforma: number;
  id_produit: number;
  nom_produit: string;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
}

// Resume d'une proforma
export interface ProformaResume {
  nb_articles: number;
  quantite_totale: number;
  montant_total: number;
}

// Proforma complete avec details
export interface ProformaComplete {
  proforma: Proforma;
  details: ProformaDetail[];
  resume: ProformaResume;
}

// Resume global de la liste des proformas
export interface ProformaResumeGlobal {
  total_proformas: number;
  montant_total: number;
  nb_brouillons: number;
  nb_acceptees: number;
  nb_converties: number;
}

// Reponse de la liste des proformas
export interface ProformaListResponse {
  success: boolean;
  proformas: Proforma[];
  resume: ProformaResumeGlobal;
}

// Reponse de creation
export interface CreateProformaResponse {
  success: boolean;
  id_proforma: number;
  num_proforma: string;
  message: string;
  nb_details?: number;
}

// Reponse de conversion proforma -> facture
export interface ConvertProformaResponse {
  success: boolean;
  id_facture: number;
  num_facture: string;
  message: string;
}

// Reponse generique (edit, delete, update statut)
export interface ProformaActionResponse {
  success: boolean;
  message: string;
}

// Filtres pour la liste des proformas
export interface FiltresProformas {
  search?: string;
  statut?: 'TOUS' | ProformaStatut;
  sortBy?: 'date' | 'montant' | 'client';
  sortOrder?: 'asc' | 'desc';
}
