/**
 * Export centralisé des composants clients
 * Facilite l'importation dans d'autres parties de l'application
 */

// Modal principal et onglets
export { ModalClientMultiOnglets } from './ModalClientMultiOnglets';
export { OngletInfosGenerales } from './OngletInfosGenerales';
export { OngletFactures } from './OngletFactures';
export { OngletHistoriqueProduits } from './OngletHistoriqueProduits';

// Types utiles pour l'importation
export type {
  TabClient,
  ClientDetailComplet,
  FactureClient,
  HistoriqueProduitClient,
  StatCard,
  FiltreFactures,
  FiltreHistorique
} from '@/types/client';