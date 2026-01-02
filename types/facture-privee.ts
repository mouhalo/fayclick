/**
 * Types spécifiques pour les factures privées des commerçants
 */

export interface DetailFacture {
  id_detail: number;
  id_produit: number;
  nom_produit: string;
  description_produit: string;
  quantite: number;
  prix: number;
  sous_total: number;
}

export interface FacturePriveeData {
  id_facture: number;
  num_facture: string;
  id_structure: number;
  nom_structure: string;
  date_facture: string;
  nannee: number;
  nmois: number;
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
  details: DetailFacture[];
}

export interface PaiementHistorique {
  id_paiement: number;
  date_paiement: string;
  montant: number;
  mode_paiement: string;
  reference: string;
  statut: string;
}

export interface ModalFacturePriveeProps {
  isOpen: boolean;
  onClose: () => void;
  factureId?: number;
  numFacture?: string;  // Numéro de facture pour optimiser la recherche
  factureData?: FacturePriveeData;
  onFactureDeleted?: (idFacture: number) => void;
  onPaymentComplete?: (factureId: number) => void;
}

export interface FacturePriveeActionsProps {
  facture: FacturePriveeData;
  onSupprimer: () => void;
  onOuvrirWallet: () => void;
  loading?: boolean;
}

export interface FacturePriveeHeaderProps {
  facture: FacturePriveeData;
  urlPartage: string;
  onClose: () => void;
}

export interface HistoriquePaiementsProps {
  idFacture: number;
  paiements: PaiementHistorique[];
  loading?: boolean;
}