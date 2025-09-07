/**
 * Index des composants de gestion des factures
 * Facilite les importations dans l'application
 */

// Stats et indicateurs
export { 
  StatsCardsFactures, 
  StatsCardsFacturesLoading 
} from './StatsCardsFactures';

// Filtres et recherche
export { FilterFactures } from './FilterFactures';

// Liste et affichage
export { 
  ListeFactures, 
  ListeFacturesLoading 
} from './ListeFactures';

// Modals
export { ModalPaiement } from './ModalPaiement';
export { ModalPartage } from './ModalPartage';

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