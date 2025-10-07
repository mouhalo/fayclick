/**
 * Types pour le catalogue public de produits
 * Réutilise les types existants de produit.ts
 */

import { PhotoProduit } from './produit';

// Produit tel que retourné par get_produits_by_structure_name
export interface ProduitPublic {
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
}

// Réponse complète de l'API get_produits_by_structure_name
export interface CatalogueResponse {
  success: boolean;
  message: string;
  nom_structure: string;
  id_structure: number;
  total_produits: number;
  logo?: string;  // Logo de la structure
  telephone?: string;  // Téléphone de la structure
  data: ProduitPublic[];
}

// Filtres pour la recherche dans le catalogue
export interface FiltresCatalogue {
  searchTerm: string;
  categorie: string;
}

// État de pagination
export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}