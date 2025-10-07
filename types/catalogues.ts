/**
 * Types pour le catalogue global multi-structures
 * Extension du catalogue individuel pour affichage centralisé
 */

import { PhotoProduit } from './produit';

// Produit avec informations de structure
export interface ProduitPublicGlobal {
  id_produit: number;
  nom_produit: string;
  prix_vente: number;
  stock_disponible: number;
  nom_categorie: string;
  description: string;
  presente_au_public: boolean;
  photo_disponible: boolean;
  nombre_photos: number;
  photos: PhotoProduit[];

  // Informations structure
  id_structure: number;
  nom_structure: string;
  logo_structure?: string;
  type_structure?: string;
}

// Réponse complète de l'API get_all_produits_publics
export interface CataloguesGlobalResponse {
  success: boolean;
  message: string;
  total_produits: number;
  total_structures: number;
  data: ProduitPublicGlobal[];
}

// Filtres pour la recherche dans le catalogue global
export interface FiltresCatalogueGlobal {
  searchProduit: string;    // Recherche par nom de produit
  searchStructure: string;  // Recherche par nom de structure
  categorie: string;        // Filtre par catégorie
}

// État de pagination pour le catalogue global
export interface PaginationStateGlobal {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalItems: number;
}

// Stats agrégées du catalogue
export interface StatsCatalogueGlobal {
  total_produits: number;
  total_structures: number;
  structures_actives: string[];
  categories_disponibles: string[];
  prix_moyen: number;
}
