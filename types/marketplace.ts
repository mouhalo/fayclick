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
  matchType: 'nom' | 'telephone' | 'live';
  score: number;
  live?: import('@/types/live').Live;
}

export interface MarketplaceStats {
  total_produits: number;
  total_structures: number;
  total_categories: number;
  total_vedettes?: number;
}

/** Structure from list_structures SQL view — lightweight, no products loaded */
export interface StructureListItem {
  id_structure: number;
  code_structure: string;
  nom_structure: string;
  adresse: string | null;
  mobile_om: string | null;
  id_localite: number | null;
  actif: boolean;
  logo: string | null;
  createdat: string;
  id_type: number | null;
  type_structure: string | null;
  a_des_produits: boolean;
  nb_produits_publics: number;
}

/** Response from getAllStructures() */
export interface AllStructuresResponse {
  success: boolean;
  total_structures: number;
  total_vedettes: number;
  structures: StructureListItem[];
}

export interface CarteStructureProps {
  structure: StructurePublique;
  index: number;
  onClick: (structure: StructurePublique) => void;
}
