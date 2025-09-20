/**
 * Index des composants factures - Export centralisé
 * Nouveau système avec Modal privé et design amélioré
 */

// Composants factures publiques
export { default as FacturePubliqueClient } from './FacturePubliqueClient';

// Composants factures privées
export { ModalFacturePrivee } from './ModalFacturePrivee';

// Modal de paiement wallet
export { ModalPaiementWalletNew } from './ModalPaiementWalletNew';
export type { WalletType } from './ModalPaiementWalletNew';

// Services
export { facturePriveeService } from '@/services/facture-privee.service';
export type {
  FacturePriveeData,
  PaiementHistorique,
  SupprimerFactureResponse
} from '@/services/facture-privee.service';

// Types
export type {
  ModalFacturePriveeProps,
  FacturePriveeActionsProps,
  FacturePriveeHeaderProps,
  HistoriquePaiementsProps
} from '@/types/facture-privee';