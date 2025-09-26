/**
 * Types pour le système de reçus FayClick V2
 * Basé sur les factures payées avec informations de paiement
 */

import { WalletType } from '@/components/facture/ModalPaiementWalletNew';

// Interface principale pour un reçu généré
export interface RecuGenere {
  id_facture: number;
  num_facture: string;
  numeroRecu: string;
  id_structure: number;
  nom_structure: string;
  date_facture: string;
  date_paiement: string;
  nom_client: string;
  tel_client: string;
  montant_facture: number;
  montant_paye: number;
  methode_paiement: WalletType;
  reference_paiement?: string;
  logo_structure?: string;
}

// Props pour le modal de reçu généré
export interface ModalRecuGenereProps {
  isOpen: boolean;
  onClose: () => void;
  factureId: number;
  walletUsed: WalletType;
  montantPaye: number;
  numeroRecu?: string;
  dateTimePaiement?: string;
  referenceTransaction?: string;
}

// Informations de paiement pour le reçu
export interface InfosPaiement {
  wallet: WalletType;
  montant: number;
  dateHeure: string;
  numeroRecu: string;
  reference?: string;
  numeroTelephone?: string;
}

// Configuration des wallets pour affichage dans le reçu
export interface WalletDisplayConfig {
  [key: string]: {
    name: string;
    displayName: string;
    color: string;
    bgGradient: string;
    icon: string;
    description: string;
  };
}

// URLs générées pour le reçu
export interface RecuUrls {
  simple: string;
  encoded: string;
  full: string;
}

// Interface pour les détails de reçu complets (réutilise la structure facture)
export interface RecuDetails {
  facture: {
    id_facture: number;
    num_facture: string;
    id_structure: number;
    nom_structure: string;
    date_facture: string;
    nom_client: string;
    tel_client: string;
    montant: number;
    libelle_etat: 'PAYEE';
    numrecu: string;
    logo: string;
    description?: string;
    mt_remise?: number;
    mt_acompte?: number;
    mt_restant?: number;
  };
  paiement: {
    date_paiement: string;
    methode_paiement: WalletType;
    montant_paye: number;
    reference_transaction?: string;
    numero_telephone?: string;
  };
  details_articles?: Array<{
    nom_produit: string;
    quantite: number;
    prix: number;
    sous_total: number;
  }>;
}

// Store pour gérer l'état du modal de reçu (similaire à useFactureSuccessStore)
export interface RecuSuccessStore {
  isOpen: boolean;
  factureId: number | null;
  walletUsed: WalletType | null;
  montantPaye: number;
  numeroRecu: string | null;
  openModal: (factureId: number, wallet: WalletType, montant: number, numeroRecu?: string) => void;
  closeModal: () => void;
}

// Types pour les actions possibles sur un reçu
export type ActionRecu = 'PARTAGER_WHATSAPP' | 'COPIER_LIEN' | 'TELECHARGER_PDF' | 'IMPRIMER' | 'VOIR_RECU';

// Configuration pour le partage WhatsApp spécifique aux reçus
export interface RecuWhatsAppConfig {
  numeroClient: string;
  messageTemplate: string;
  includeQRCode: boolean;
}

// Export des types pour compatibilité
export type {
  RecuGenere as Receipt,
  ModalRecuGenereProps as ReceiptModalProps,
  InfosPaiement as PaymentInfo,
  RecuDetails as ReceiptDetails
};