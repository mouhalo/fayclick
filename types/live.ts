/**
 * Types pour le module Live Shopping
 * Permet aux marchands de creer des lives et publier des produits en ligne
 */

export interface Live {
  id_live: number;
  id_structure: number;
  date_debut: string;
  date_fin: string;
  nom_du_live: string;
  tel_contact1: string | null;
  tel_contact2: string | null;
  createdat: string;
  // Enrichi par get_active_live
  produits?: LiveProduit[];
  // Enrichi par get_lives_actifs
  nom_structure?: string;
  logo?: string;
  nb_produits?: number;
}

export interface LiveProduit {
  id_produit: number;
  nom_produit: string;
  prix_vente: number;
  niveau_stock: number;
  photo_disponible?: boolean;
  photos?: string;
  presente_au_public?: boolean;
}

export interface CreateLiveParams {
  id_structure: number;
  nom_du_live: string;
  date_debut: string;
  date_fin: string;
  tel_contact1?: string;
  tel_contact2?: string;
  produit_ids: number[];
}

export interface CreateLiveResponse {
  success: boolean;
  id_live?: number;
  message: string;
  nb_produits?: number;
  id_live_existant?: number;
}

export interface DeleteLiveResponse {
  success: boolean;
  message: string;
}

export interface ActiveLiveResponse {
  success: boolean;
  live: Live | null;
  message?: string;
}

export interface LivesActifsResponse {
  success: boolean;
  total: number;
  lives: Live[];
}
