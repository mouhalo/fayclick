/**
 * Types TypeScript pour le système de panier et facturation
 * FayClick V2 - Système de commerce
 */

import { ArticlePanier } from './produit';

export type { ArticlePanier };

export interface InfosClient {
  id_client?: number; // 🆕 ID du client si existant (pour éviter les doublons en DB)
  nom_client_payeur?: string;
  tel_client?: string;
  description?: string;
}

export interface MontantsFacture {
  sous_total: number;
  remise: number;
  montant_net: number;
  acompte: number;
  reste_a_payer: number;
}

// Interface pour les options de partage de facture
export interface OptionsPartage {
  qr_code?: boolean;
  whatsapp?: boolean;
  url?: boolean;
  email?: boolean;
}

// Réponse de création de facture avec options de partage
export interface FactureCreatedResponse {
  success: boolean;
  id_facture: number;
  message: string;
  url_facture?: string;
  qr_code_data?: string;
}

// Interface pour le Toast de partage post-facture
export interface ToastPartageProps {
  isVisible: boolean;
  factureId: number;
  urlFacture?: string;
  onClose: () => void;
  onShare: (type: 'qr' | 'whatsapp' | 'url') => void;
}