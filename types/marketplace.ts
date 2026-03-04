/**
 * Types partagés pour la marketplace FayClick
 * Utilisés par la recherche, le carrousel boutiques, et les pages publiques
 */

export interface StructurePublique {
  id_structure: number;
  nom_structure: string;
  logo_structure?: string;
  type_structure?: string;
  telephone?: string;
  adresse?: string;
  total_produits: number;
  categories: string[];
}

export interface SearchResult {
  structure: StructurePublique;
  matchType: 'nom' | 'telephone';
  score: number;
}

export interface MarketplaceStats {
  total_produits: number;
  total_structures: number;
  total_categories: number;
}

export interface CarteStructureProps {
  structure: StructurePublique;
  index: number;
  onClick: (structure: StructurePublique) => void;
}
