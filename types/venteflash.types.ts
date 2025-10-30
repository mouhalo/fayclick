/**
 * Types TypeScript pour le système de Vente Flash
 * Gestion rapide des ventes avec scan code-barre
 */

export interface VenteFlash {
  id_facture: number;
  num_facture: string;
  date_facture: string;
  montant_total: number;
  montant_paye: number;
  montant_impaye?: number;
  mode_paiement: 'OM' | 'WAVE' | 'FREE' | 'ESPECES' | 'CHEQUE' | 'CREDIT' | string;
  nom_client: string;
  tel_client: string;
  nom_caissier?: string;
  id_utilisateur?: number;
  statut?: string;
  details?: DetailVente[];  // Détails déjà chargés avec la facture
}

export interface VenteFlashStats {
  nb_ventes: number;
  total_ventes: number;
  ca_jour: number;
}

export interface DetailVente {
  id_detail?: number;
  id_produit: number;
  nom_produit: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
}

export interface SearchProductResult {
  id_produit: number;
  nom_produit: string;
  prix_vente: number;
  niveau_stock: number;
  code_barre?: string;
  description?: string;
}
