/**
 * Types pour le module de gestion des factures
 * Basé sur la fonction PostgreSQL get_my_facture()
 */

// Interface principale pour une facture
export interface Facture {
  id_facture: number;
  num_facture: string;
  id_structure: number;
  nom_structure: string;
  date_facture: string;
  annee: number;
  mois: number;
  description: string;
  nom_classe: string;
  tel_client: string;
  nom_client: string;
  montant: number;
  id_etat: number;
  libelle_etat: 'PAYEE' | 'IMPAYEE';
  numrecu: string;
  logo: string;
  tms_update: string | null;
  avec_frais: boolean;
  periode: string;
  mt_reverser: boolean;
  mt_remise: number;
  mt_acompte: number;
  mt_restant: number;
  photo_url: string;
}

// Interface pour les détails d'une facture (articles)
export interface DetailFacture {
  id_detail: number;
  id_facture: number;
  date_facture: string;
  nom_produit: string;
  cout_revient: number;
  quantite: number;
  prix: number;
  marge: number;
  id_produit: number;
  sous_total: number;
}

// Interface pour le résumé d'une facture
export interface ResumeFacture {
  nombre_articles: number;
  quantite_totale: number;
  cout_total_revient: number;
  marge_totale: number;
}

// Interface pour une facture complète avec détails
export interface FactureComplete {
  facture: Facture;
  details: DetailFacture[];
  resume: ResumeFacture;
}

// Interface pour le résumé global de toutes les factures
export interface ResumeGlobal {
  nombre_factures: number;
  montant_total: number;
  montant_paye: number;
  montant_impaye: number;
  nombre_payees: number;
  nombre_impayees: number;
}

// Interface pour la réponse complète de get_my_facture
export interface GetMyFactureResponse {
  factures: FactureComplete[];
  resume_global: ResumeGlobal;
  timestamp_generation: string;
}

// Interface pour les filtres de recherche
export interface FiltresFactures {
  searchTerm?: string; // Recherche par numéro, client, téléphone
  periode?: {
    debut: string;
    fin: string;
  };
  nom_client?: string;
  tel_client?: string;
  statut?: 'PAYEE' | 'IMPAYEE' | 'TOUS';
  sortBy?: 'date' | 'montant' | 'client' | 'statut';
  sortOrder?: 'asc' | 'desc';
}

// Interface pour les statistiques des factures (4 cards)
export interface StatsFactures {
  totalVentes: number;
  montantTotal: number;
  montantPaye: number;
  restantPayer: number;
  totalProduitsDifferents: number;
  quantiteTotale: number;
  clientsUniques: number;
  margeTotale: number;
}

// Interface pour ajouter un acompte
export interface AjouterAcompteData {
  id_structure: number;
  id_facture: number;
  montant_acompte: number;
  transaction_id: string;
  uuid: string;
}

// Interface pour la réponse d'ajout d'acompte
export interface AjouterAcompteResponse {
  success: boolean;
  message: string;
  facture: {
    id_facture: number;
    num_facture: string;
    client: string;
    tel_client: string;
    montant_facture: number;
    ancien_acompte: number;
    montant_verse: number;
    nouveau_acompte: number;
    ancien_restant: number;
    nouveau_restant: number;
    ancien_etat: number;
    nouvel_etat: number;
    statut: 'PAYEE' | 'IMPAYEE';
  };
  timestamp_operation: string;
}

// Interface pour les données de partage de facture
export interface PartageFacture {
  id_structure: number;
  id_facture: number;
  url_publique: string;
  qr_code_data: string;
  token_securise: string;
}

// Types d'état des factures
export type EtatFacture = 'PAYEE' | 'IMPAYEE';

// Types d'actions possibles sur une facture
export type ActionFacture = 'VOIR_DETAILS' | 'AJOUTER_ACOMPTE' | 'PARTAGER' | 'IMPRIMER';

// Configuration d'affichage des factures
export interface ConfigFacturesAffichage {
  cardsParPage: number;
  afficherDetails: boolean;
  colonnesVisibles: string[];
  groupement: 'AUCUN' | 'STATUT' | 'PERIODE' | 'CLIENT';
}

// Export des types pour compatibilité
export type {
  Facture as Invoice,
  DetailFacture as InvoiceDetail,
  FactureComplete as CompleteInvoice,
  StatsFactures as InvoiceStats,
  FiltresFactures as InvoiceFilters
};