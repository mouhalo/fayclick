// Types et interfaces pour le système de gestion des clients FayClick
export interface Client {
  id_client: number;
  nom_client: string;
  tel_client: string;
  adresse: string;
  date_creation: string;
  date_modification: string;
}

export interface StatistiquesFactures {
  nombre_factures: number;
  montant_total_factures: number;
  montant_paye: number;
  montant_impaye: number;
  nombre_factures_payees: number;
  nombre_factures_impayees: number;
  pourcentage_paiement: number;
  date_premiere_facture: string;
  date_derniere_facture: string;
}

export interface ClientWithStats {
  client: Client;
  statistiques_factures: StatistiquesFactures;
}

// Interfaces pour le modal multi-onglets
export interface FactureClient {
  id_facture: number;
  numero_facture: string;
  date_facture: string;
  montant_facture: number;
  statut_paiement: 'PAYEE' | 'IMPAYEE' | 'PARTIELLE';
  date_paiement?: string;
  montant_paye?: number;
  montant_restant?: number;
}

export interface HistoriqueProduitClient {
  id_produit: number;
  nom_produit: string;
  quantite_totale: number;
  montant_total: number;
  date_derniere_commande: string;
  nombre_commandes: number;
  prix_unitaire_moyen: number;
}

export interface StatsHistoriqueProduits {
  article_favori: string;
  article_favori_quantite: number;
  nombre_articles_differents: number;
  montant_max_achat: number;
  date_montant_max: string;
  produit_montant_max: string;
  montant_min_achat: number;
  date_montant_min: string;
  produit_montant_min: string;
}

export interface ClientDetailComplet extends ClientWithStats {
  factures: FactureClient[];
  historique_produits: HistoriqueProduitClient[];
  stats_historique: StatsHistoriqueProduits;
  anciennete_jours: number;
  anciennete_texte: string; // "2 ans, 3 mois"
}

// Interfaces pour les réponses API
export interface StatistiquesGlobales {
  nombre_total_clients: number;
  montant_total_structure: number;
  montant_paye_structure: number;
  montant_impaye_structure: number;
  nombre_clients_actifs: number;
  nombre_clients_inactifs: number;
  taux_recouvrement_global: number;
}

export interface ClientsApiResponse {
  success: boolean;
  structure_id: number;
  clients: ClientWithStats[];
  statistiques_globales: StatistiquesGlobales;
  timestamp_generation: string;
}

// Pour la création/édition de clients
export interface AddEditClientResponse {
  result_id_client: number;
  result_nom_client: string;
  result_tel_client: string;
  result_adresse: string;
  result_date_creation: string;
  result_date_modification: string;
  result_id_structure: number;
  result_action_effectuee: 'CREATION' | 'MODIFICATION';
  result_factures_mises_a_jour: number;
}

// Types pour les formulaires
export interface ClientFormData {
  nom_client: string;
  tel_client: string;
  adresse: string;
  id_client?: number; // Pour l'édition
}

// Types pour les onglets du modal
export type TabClient = 'general' | 'factures' | 'historique';

export interface TabConfig {
  id: TabClient;
  label: string;
  icon: string;
  color: string;
}

// Types pour les filtres
export interface FiltreFactures {
  statut: 'TOUTES' | 'PAYEES' | 'IMPAYEES' | 'PARTIELLES';
  date_debut?: string;
  date_fin?: string;
}

export interface FiltreHistorique {
  recherche: string;
  tri: 'quantite' | 'montant' | 'date' | 'nom';
  ordre: 'asc' | 'desc';
}

// Types utilitaires
export interface StatCard {
  id: string;
  label: string;
  value: string | number;
  icon: string;
  color: string;
  badge?: string;
  trend?: {
    value: number;
    type: 'up' | 'down' | 'stable';
  };
}

// Exception pour les erreurs clients
export class ClientsApiException extends Error {
  constructor(public message: string, public status?: number, public details?: unknown) {
    super(message);
    this.name = 'ClientsApiException';
  }
}

// Fonctions utilitaires pour les types
export function formatAnciennete(jours: number): string {
  if (jours < 30) {
    return `${jours} jour${jours > 1 ? 's' : ''}`;
  } else if (jours < 365) {
    const mois = Math.floor(jours / 30);
    const joursRestants = jours % 30;
    return joursRestants > 0 
      ? `${mois} mois, ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`
      : `${mois} mois`;
  } else {
    const annees = Math.floor(jours / 365);
    const joursRestants = jours % 365;
    const moisRestants = Math.floor(joursRestants / 30);
    return moisRestants > 0
      ? `${annees} an${annees > 1 ? 's' : ''}, ${moisRestants} mois`
      : `${annees} an${annees > 1 ? 's' : ''}`;
  }
}

export function calculateAnciennete(datePremiere: string): { jours: number; texte: string } {
  const dateDebut = new Date(datePremiere);
  const maintenant = new Date();
  const diffTime = maintenant.getTime() - dateDebut.getTime();
  const jours = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    jours,
    texte: formatAnciennete(jours)
  };
}

export function getStatutFactureBadgeColor(statut: FactureClient['statut_paiement']): string {
  switch (statut) {
    case 'PAYEE':
      return 'bg-green-500/20 text-green-200 border-green-400/30';
    case 'IMPAYEE':
      return 'bg-red-500/20 text-red-200 border-red-400/30';
    case 'PARTIELLE':
      return 'bg-orange-500/20 text-orange-200 border-orange-400/30';
    default:
      return 'bg-gray-500/20 text-gray-200 border-gray-400/30';
  }
}