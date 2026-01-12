/**
 * Types pour la gestion des Wallets (OM, WAVE, FREE)
 * Utilisés par get_wallet_structure() et get_soldes_wallet_structure()
 */

// Soldes simplifiés (get_soldes_wallet_structure)
export interface WalletSoldes {
  solde_om: number;
  solde_wave: number;
  solde_free: number;
  solde_total: number;
}

// Détail solde par wallet
export interface WalletSoldeDetail {
  total_encaisse: number;
  total_net: number;
  total_frais: number;
  total_retire: number;
  solde_disponible: number;
}

// Structure des soldes complets
export interface WalletSoldesComplets {
  om: WalletSoldeDetail;
  wave: WalletSoldeDetail;
  free: WalletSoldeDetail;
  global: WalletSoldeDetail;
}

// Paiement reçu (encaissement)
export interface PaiementRecu {
  id_recu: number;
  id_facture: number;
  date_paiement: string;
  wallet: 'OM' | 'WAVE' | 'FREE';
  montant_recu: number;
  montant_net: number;
  frais: number;
  reference: string;
  telephone: string | null;
  type: 'ENCAISSEMENT';
}

// Retrait effectué
export interface RetraitEffectue {
  id_versement: number;
  date_retrait: string;
  wallet: 'OM' | 'WAVE' | 'FREE';
  montant: number;
  montant_initial: number;
  reference: string;
  ref_confirmation: string;
  compte_destination: string;
  agent: string;
  etat: 'EFFECTUE' | 'EN_ATTENTE' | 'ANNULE';
  motif: string;
  type: 'RETRAIT';
}

// Historique wallet
export interface WalletHistorique {
  paiements_recus: PaiementRecu[];
  retraits_effectues: RetraitEffectue[];
}

// Statistiques wallet
export interface WalletStats {
  nb_paiements_wallet: number;
  nb_retraits: number;
  nb_paiements_om: number;
  nb_paiements_wave: number;
  nb_paiements_free: number;
  taux_frais_moyen: number;
  dernier_paiement: string | null;
  dernier_retrait: string | null;
}

// Info structure dans wallet
export interface WalletStructureInfo {
  id_structure: number;
  nom: string;
  mobile_om: string;
  mobile_wave: string;
}

// Réponse complète get_wallet_structure
export interface WalletStructureData {
  success: boolean;
  structure: WalletStructureInfo;
  soldes: WalletSoldesComplets;
  stats: WalletStats;
  historique: WalletHistorique;
  generated_at: string;
}

// Transaction unifiée pour affichage tableau
export interface WalletTransaction {
  id: number;
  date: string;
  telephone: string | null;
  sens: 'ENTREE' | 'SORTIE';
  montant: number;
  wallet: 'OM' | 'WAVE' | 'FREE';
  reference: string;
  type: 'ENCAISSEMENT' | 'RETRAIT';
}
