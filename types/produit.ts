/**
 * Types pour le module de gestion des produits/services
 * Utilisé par les structures COMMERCIALE et PRESTATAIRE DE SERVICES
 */

// Interface principale pour un produit/service
export interface Produit {
  id_produit: number;
  id_structure: number;
  nom_produit: string;
  cout_revient: number;
  prix_vente: number;
  niveau_stock?: number;
  est_service?: boolean; // Nouveau champ pour différencier produit/service
  // Champs calculés depuis la vue SQL
  marge?: number;
  valeur_stock?: number;
  revenu_potentiel?: number;
  // Métadonnées
  created_at?: string;
  updated_at?: string;
  description?: string;
  nom_categorie?: string;
  unite_mesure?: string;
  code_produit?: string;
  code_barre?: string; // Code-barres du produit (EAN-13, CODE_128, etc.)
  image_url?: string;
  // Catalogue public
  presente_au_public?: boolean;
  photo_disponible?: boolean;
  photos?: PhotoProduit[];
}

// Interface pour les mouvements de stock
export interface MouvementStock {
  id: number;
  id_produit: number;
  id_structure: number;
  type_mouvement: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT';
  quantite: number;
  prix_unitaire: number;
  description?: string;
  reference_document?: string; // Numéro de facture, bon de commande, etc.
  date_mouvement: Date;
  tms_create: Date;
  created_by?: number;
  // Champs supplémentaires depuis la jointure
  nom_produit?: string;
  total?: number;
}

// Article dans le panier avec quantité
export interface ArticlePanier extends Produit {
  quantity: number;
}

// Statistiques de la structure pour les produits
export interface StatsStructureProduits {
  totalProduits: number;
  valeurStock: number;
  margeGlobale: number;
  revenuPotentiel: number;
  produitsEnRupture: number;
  produitsStockFaible: number;
}

// Configuration des seuils d'alerte
export interface SeuilsStock {
  seuilMin: number;
  seuilMax: number;
  seuilAlerte: number;
}

// Filtre pour la recherche de produits
export interface FiltreProduits {
  searchTerm?: string;
  nom_categorie?: string;
  enStock?: boolean;
  prixMin?: number;
  prixMax?: number;
  sortBy?: 'nom' | 'prix' | 'stock' | 'marge';
  sortOrder?: 'asc' | 'desc';
}

// Données du formulaire de produit avec validation Zod (ancien format)
export interface ProduitFormData {
  nom_produit: string;
  cout_revient: number;
  prix_vente: number;
  niveau_stock?: number;
  description?: string;
  nom_categorie?: string;
  unite_mesure?: string;
  code_produit?: string;
}

// Nouvelles données du formulaire simplifié (API add_edit_produit)
export interface ProduitFormDataNew {
  nom_produit: string;
  cout_revient: number;
  prix_vente: number;
  est_service: boolean;
  description?: string;
  nom_categorie?: string;
  presente_au_public?: boolean;
  code_barres?: string;
}

// Données formulaire mouvement de stock
export interface MouvementStockForm {
  quantite: number;
  prix_unitaire: number;
  type_mouvement: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT';
  description?: string;
}

// Réponse de l'API add_edit_produit
export interface AddEditProduitResponse {
  id_produit: number;
  id_structure: number;
  nom_produit: string;
  cout_revient: number;
  prix_vente: number;
  est_service: boolean;
  nom_categorie: string;
  description: string;
  action_effectuee: string;
  code_barres?: string;
}

// Réponse API pour la liste des produits
export interface ProduitsApiResponse {
  success: boolean;
  data: Produit[];
  total: number;
  page?: number;
  pageSize?: number;
}

// Réponse API pour un produit unique
export interface ProduitApiResponse {
  success: boolean;
  data: Produit;
}

// État du panier
export interface PanierState {
  items: ArticlePanier[];
  total: number;
  nombreArticles: number;
  isOpen: boolean;
}

// Types pour les ventes (pour le calcul du CA)
export interface Vente {
  id_vente: number;
  id_produit: number;
  id_structure: number;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
  date_vente: Date;
  id_client?: number;
  reference_facture?: string;
}

// Historique des prix
export interface HistoriquePrix {
  id: number;
  id_produit: number;
  ancien_prix: number;
  nouveau_prix: number;
  date_changement: Date;
  motif?: string;
  changed_by?: number;
}

// Categories de produits/services
export interface Categorie {
  id_categorie: number;
  nom_categorie: string;
  description?: string;
  couleur?: string; // Pour l'affichage UI
  icone?: string;   // Emoji ou nom d'icône
  ordre?: number;   // Pour le tri d'affichage
}

// Statistiques détaillées par produit
export interface StatsProduit {
  id_produit: number;
  nom_produit: string;
  ventesMois: number;
  ventesTotal: number;
  stockActuel: number;
  tauxRotation: number;
  margeUnitaire: number;
  contribution: number; // % du CA total
}

// Historique des mouvements avec totaux
export interface HistoriqueMouvements {
  mouvements: MouvementStock[];
  totalEntrees: number;
  totalSorties: number;
  totalEntriesMontant: number;
  totalSortiesMontant: number;
}

// Configuration pour l'affichage selon le type de structure
export interface ConfigurationAffichage {
  typeStructure: 'COMMERCIALE' | 'PRESTATAIRE DE SERVICES';
  labels: {
    produit: string; // 'Produit' ou 'Service'
    stock: string;   // 'Stock' ou 'Disponibilité'
    cout: string;    // 'Coût de revient' ou 'Coût prestation'
    vente: string;   // 'Prix de vente' ou 'Tarif prestation'
  };
  afficherStock: boolean;
  afficherCategories: boolean;
  afficherCoutRevient: boolean;
}

// Interface pour les photos de produits
export interface PhotoProduit {
  id_photo?: number;
  id_produit: number;
  id_structure: number;
  url_photo: string;
  ordre?: number;
  created_at?: string;  // Aussi mappé depuis date_upload
  updated_at?: string;  // Aussi mappé depuis date_maj
  date_upload?: string; // Champ original de la BDD
  date_maj?: string;    // Champ original de la BDD
}

// Paramètres pour add_edit_photo
export interface AddEditPhotoParams {
  id_structure: number;
  id_produit: number;
  url_photo: string;
  id_photo?: number;  // Pour update
}

// Réponse API add_edit_photo
export interface AddEditPhotoResponse {
  success: boolean;
  message: string;
  code_erreur?: string;
  data: {
    id_photo: number;
    id_produit?: number;
    url_photo?: string;
    operation?: 'INSERT' | 'UPDATE';
  };
}

// Produit pour catalogue public
export interface ProduitCatalogue extends Produit {
  photos: PhotoProduit[];
  nom_structure: string;
  adresse?: string;
  mobile_om?: string;
  mobile_wave?: string;
}

// Export groupé pour faciliter les imports
export type {
  MouvementStock as StockMovement,
  ArticlePanier as CartItem,
  StatsStructureProduits as ProductStats,
  FiltreProduits as ProductFilter,
  ProduitFormData as ProductFormData
};