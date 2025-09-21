/**
 * Types pour le système de paiement par wallet
 * Support pour Orange Money, Wave et Free Money
 */

// Types de méthodes de paiement
export type PaymentMethod = 'CASH' | 'OM' | 'WAVE' | 'FREE';

// Types de services wallet
export type WalletService = 'OFMS' | 'INTOUCH' | 'FREE_MONEY';

// Statuts de paiement
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';

// Mapping des méthodes vers les services
export const WALLET_SERVICE_MAP: Record<Exclude<PaymentMethod, 'CASH'>, WalletService> = {
  'OM': 'OFMS',
  'WAVE': 'INTOUCH',
  'FREE': 'FREE_MONEY'
};

// Configuration des wallets
export const WALLET_CONFIG = {
  OM: {
    name: 'Orange Money',
    color: 'bg-orange-500',
    icon: '🟠',
    minAmount: 100,
    maxAmount: 5000000
  },
  WAVE: {
    name: 'Wave',
    color: 'bg-blue-600',
    icon: '🌊',
    minAmount: 100,
    maxAmount: 5000000
  },
  FREE: {
    name: 'Free Money',
    color: 'bg-green-600',
    icon: '💚',
    minAmount: 100,
    maxAmount: 5000000
  }
} as const;

/**
 * Interface pour la requête de création de paiement
 */
export interface CreatePaymentRequest {
  pAppName: 'FAYCLICK';
  pMethode: 'OM' | 'WAVE' | 'FREE';
  pReference: string;           // num_facture
  pClientTel: string;           // tel_client
  pMontant: number;             // montant de l'acompte
  pServiceName: WalletService;
  pNomClient: string;           // nom_client
  pPrenomClient?: string;
  pEmailClient?: string;
  pnom_structure: string;       // nom de la structure du marchant
  purl_success?: string;
  purl_fail?: string;
}

/**
 * Interface pour la réponse de création de paiement
 */
export interface CreatePaymentResponse {
  uuid: string;
  telephone: string;
  status: string;
  service: string;
  maxit?: string;               // URL MaxIt (OM uniquement)
  om?: string;                  // DeepLink OM (OM uniquement)
  payment_url?: string;         // URL paiement (Wave/Free)
  qrCode: string;               // QR code en base64
}

/**
 * Interface pour la réponse du statut de paiement
 */
export interface PaymentStatusResponse {
  status: string;
  message: string;
  uuid: string;
  data?: {
    uuid: string;
    reference_externe: string;
    statut: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    wallet_mode: string;
    montant: string;
    telephone: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
    metadata?: {
      method: string;
      app_name: string;
      callback_received: boolean;
      original_status: string;
    };
  };
}

/**
 * Interface pour les données d'acompte à envoyer après paiement réussi
 */
export interface AcompteData {
  id_facture: number;
  montant: number;
  mode_paiement: PaymentMethod;
  reference_paiement?: string;  // UUID du paiement wallet
  telephone_payeur?: string;
}

/**
 * Interface pour le contexte de paiement dans les modals
 */
export interface PaymentContext {
  facture: {
    id_facture: number;
    num_facture: string;
    nom_client: string;
    tel_client: string;
    montant_total: number;
    montant_restant: number;
  };
  montant_acompte: number;
  payment_method?: PaymentMethod;
  payment_uuid?: string;
  qr_code?: string;
}

/**
 * Props pour les composants de paiement
 */
export interface ModalChoixPaiementProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: PaymentMethod) => void;
  montantAcompte: number;
}

export interface ModalPaiementQRCodeProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: Exclude<PaymentMethod, 'CASH'>;
  paymentContext: PaymentContext;
  onPaymentComplete: (uuid: string) => void;
  onPaymentFailed: (error: string) => void;
}

/**
 * Helpers pour la validation
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Format sénégalais : 77, 78, 76, 70, 75
  const senegalPhoneRegex = /^(77|78|76|70|75)\d{7}$/;
  return senegalPhoneRegex.test(phone.replace(/\s/g, ''));
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return cleaned;
  }
  if (cleaned.startsWith('221') && cleaned.length === 12) {
    return cleaned.substring(3);
  }
  if (cleaned.startsWith('+221') && cleaned.length === 13) {
    return cleaned.substring(4);
  }
  return cleaned;
};

export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};