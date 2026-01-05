/**
 * Index des composants de gestion des factures pour PRESTATAIRES DE SERVICES
 * Facilite les importations dans l'application
 */

// Stats et indicateurs
export { StatsCardsFacturesGlass } from './StatsCardsFacturesGlass';

// Filtres et recherche
export { FilterHeaderGlass } from './FilterHeaderGlass';
export { FilterHeaderPaiementsGlass } from './FilterHeaderPaiementsGlass';

// Liste et affichage
export { FacturesList } from './FacturesList';
export { FactureCard } from './FactureCard';
export { FacturesOnglets } from './FacturesOnglets';
export { ListePaiements } from './ListePaiements';

// Modals
export { ModalPaiement } from './ModalPaiement';
export { ModalPartage } from './ModalPartage';
export { ModalPaiementQRCode } from './ModalPaiementQRCode';
export { ModalChoixPaiement } from './ModalChoixPaiement';
export { ModalConfirmationPaiement } from './ModalConfirmationPaiement';
export { ModalFacturePrestataire } from './ModalFacturePrestataire';

// Composants utilitaires
export { PaymentMethodSelector } from './PaymentMethodSelector';

// Types principaux exportés
export type {
  StatsFactures,
  FiltresFactures,
  FactureComplete,
  Facture,
  DetailFacture,
  ResumeFacture,
  GetMyFactureResponse,
  AjouterAcompteData,
  AjouterAcompteResponse,
  PartageFacture
} from '@/types/facture';
