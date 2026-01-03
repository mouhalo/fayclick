/**
 * Types pour le module Prestataire de Services
 * Gestion des services, devis et prestations
 */

// ============================================================================
// SERVICE (Catalogue de services proposés)
// ============================================================================

export interface Service {
  id_service: number;
  id_structure: number;
  nom_service: string;
  cout_base: number;           // Tarif de référence (ajustable par prestation)
  description?: string;
  nom_categorie?: string;
  actif: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceFormData {
  nom_service: string;
  cout_base: number;
  description?: string;
  nom_categorie?: string;
}

export interface ServiceApiResponse {
  success: boolean;
  data: Service;
  message?: string;
}

export interface ServicesListResponse {
  success: boolean;
  data: Service[];
  total: number;
}

// ============================================================================
// DEVIS
// ============================================================================

export interface Devis {
  id_devis: number;
  id_structure: number;
  date_devis: string;
  tel_client: string;
  nom_client: string;

  // Montants
  montant_services: number;      // Total des services (main d'oeuvre) = comptabilisé CA
  montant_equipements: number;   // Total des équipements (achats client) = NON comptabilisé
  montant_total: number;         // Services + Équipements

  // Statut
  statut: DevisStatut;

  // Détails
  lignes_services?: DevisLigneService[];
  lignes_equipements?: LigneEquipement[];

  // Métadonnées
  id_utilisateur?: number;
  created_at?: string;
  updated_at?: string;
}

export type DevisStatut = 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE' | 'FACTURE';

export interface DevisLigneService {
  id_service?: number;
  nom_service: string;
  cout: number;                  // Prix facturé (peut différer du cout_base)
  quantite?: number;             // Quantité (défaut: 1)
}

export interface LigneEquipement {
  designation: string;
  marque?: string;
  prix_unitaire: number;
  quantite: number;
  total: number;
}

export interface DevisFormData {
  date_devis: string;
  tel_client: string;
  nom_client: string;
  montant_services: number;
  lignes_services: DevisLigneService[];
  lignes_equipements: LigneEquipement[];
}

export interface DevisApiResponse {
  success: boolean;
  data: Devis;
  message?: string;
  id_devis?: number;
}

export interface DevisListResponse {
  success: boolean;
  data: Devis[];
  total: number;
}

// ============================================================================
// RÉPONSE get_my_devis() - Format PostgreSQL
// ============================================================================

export interface GetMyDevisResponse {
  success: boolean;
  code: string;
  periode: {
    label: string;
    annee: number;
    mois: number | null;
    date_debut: string;
    date_fin: string;
  };
  devis: DevisFromDB[];
  resume_global: {
    nombre_devis: number;
    montant_total: number;
    montant_total_produits: number;
    montant_total_equipements: number;
    nb_total_produits: number;
    nb_clients: number;
    devis_par_mois?: Array<{
      mois: number;
      nb_devis: number;
      montant: number;
    }>;
  };
  timestamp_generation: string;
}

export interface DevisFromDB {
  devis: {
    id_devis: number;
    num_devis: string;
    date_devis: string;
    id_structure: number;
    nom_structure: string;
    annee: number;
    mois: number;
    tel_client: string;
    nom_client_payeur: string;
    montant: number;                    // Montant des services/produits
    lignes_equipements: LigneEquipement[];
    montant_equipement: number;
    id_utilisateur: number;
    tms_create: string;
  };
  details_produits: Array<{
    id_detail: number;
    id_devis: number;
    id_produit: number;
    nom_produit: string;
    quantite: number;
    prix: number;
    sous_total: number;
  }>;
  resume: {
    nb_produits: number;
    montant_produits: number;
    nb_equipements: number;
    montant_equipements: number;
  };
}

// ============================================================================
// PRESTATION (Facture de service réalisé)
// ============================================================================

export interface Prestation {
  id_prestation: number;
  id_structure: number;
  id_facture?: number;           // Lien vers facture si existe

  // Client
  id_client?: number;
  nom_client: string;
  tel_client: string;

  // Date
  date_prestation: string;

  // Montants
  montant_total: number;
  montant_paye: number;
  remise: number;

  // Statut
  statut: PrestationStatut;
  mode_paiement?: ModePaiement;

  // Détails
  services: PrestationLigne[];
  description?: string;

  // Métadonnées
  id_utilisateur?: number;
  created_at?: string;
}

export type PrestationStatut = 'PAYEE' | 'PARTIELLE' | 'IMPAYEE';
export type ModePaiement = 'CASH' | 'WAVE' | 'OM' | 'FREE' | 'CREDIT';

export interface PrestationLigne {
  id_service?: number;
  nom_service: string;
  cout: number;                  // Prix facturé
}

export interface PrestationFormData {
  nom_client: string;
  tel_client: string;
  services: PrestationLigne[];
  remise?: number;
  mode_paiement: ModePaiement;
  description?: string;
}

export interface PrestationApiResponse {
  success: boolean;
  data: Prestation;
  message?: string;
  id_prestation?: number;
  id_facture?: number;
}

export interface PrestationsListResponse {
  success: boolean;
  data: Prestation[];
  total: number;
}

// ============================================================================
// PANIER PRESTATION (État temporaire)
// ============================================================================

export interface PanierPrestationState {
  services: PrestationLigne[];
  client: {
    id_client?: number;
    nom_client: string;
    tel_client: string;
  };
  remise: number;
  total: number;
}

// ============================================================================
// STATISTIQUES PRESTATAIRE
// ============================================================================

export interface StatsPrestataire {
  // Compteurs
  total_services: number;
  total_clients: number;
  total_prestations_mois: number;
  total_devis_en_attente: number;

  // Financier
  ca_mois: number;
  ca_annee: number;
  mt_impayees: number;

  // Évolution
  evolution_ca_mois: number;     // % par rapport au mois précédent
}

// ============================================================================
// FILTRES ET RECHERCHE
// ============================================================================

export interface FiltreServices {
  searchTerm?: string;
  nom_categorie?: string;
  actif?: boolean;
  sortBy?: 'nom' | 'cout' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface FiltreDevis {
  periode?: 'jour' | 'semaine' | 'mois' | 'annee' | 'tout';
  statut?: DevisStatut;
  searchTerm?: string;
}

export interface FiltrePrestations {
  periode?: 'jour' | 'semaine' | 'mois' | 'annee' | 'tout';
  statut?: PrestationStatut;
  searchTerm?: string;
}

// ============================================================================
// CATÉGORIES SERVICES PRÉDÉFINIES
// ============================================================================

export const CATEGORIES_SERVICES = [
  'Plomberie',
  'Électricité',
  'Maçonnerie',
  'Peinture',
  'Menuiserie',
  'Soudure',
  'Mécanique',
  'Coiffure',
  'Couture',
  'Informatique',
  'Formation',
  'Consultation',
  'Autre'
] as const;

export type CategorieService = typeof CATEGORIES_SERVICES[number];

// ============================================================================
// EXPORTS GROUPÉS
// ============================================================================

export type {
  Service as ServicePrestataire,
  Devis as DevisPrestataire,
  Prestation as PrestationRealisee
};
