/**
 * Types TypeScript pour le système de Statistiques Inventaires
 * Structure basée sur la fonction PostgreSQL get_inventaire()
 */

export type PeriodeType = 'semaine' | 'mois' | 'annee';

/**
 * Résumé des ventes avec variations par rapport à la période précédente
 */
export interface ResumeVentes {
  ca_total: number;
  ca_variation: number;
  ventes_total: number;
  ventes_variation: number;
  panier_moyen: number;
  panier_variation: number;
  clients_actifs: number;
  clients_variation: number;
}

/**
 * Point de données pour le graphique d'évolution des ventes
 */
export interface EvolutionVente {
  periode: string;      // Code court (Mon, S23, Jan)
  label: string;        // Label complet (13/10, Semaine 23, January 2025)
  montant: number;      // Montant total des ventes
  nombre_ventes: number; // Nombre de factures
}

/**
 * Article dans le top 5 des meilleurs produits
 */
export interface TopArticle {
  rang: number;
  nom_produit: string;
  nom_categorie: string;
  montant_total: number;
  nombre_ventes: number;
  quantite_totale: number;
}

/**
 * Client dans le top 5 des meilleurs clients
 */
export interface TopClient {
  rang: number;
  nom_client: string;
  tel_client: string;
  initiales: string;
  montant_total: number;
  nombre_factures: number;
  statut: 'VIP' | 'Premium' | 'Standard';
}

/**
 * Réponse complète de la fonction get_inventaire
 */
export interface InventaireData {
  success: boolean;
  structure_id: number;
  periode: PeriodeType;
  annee: number;
  date_debut: string;
  date_fin: string;
  resume_ventes: ResumeVentes;
  evolution_ventes: EvolutionVente[];
  top_articles: TopArticle[];
  top_clients: TopClient[];
  timestamp_generation: string;
  error?: string; // Optionnel en cas d'erreur
}

/**
 * Paramètres pour la requête de statistiques
 */
export interface InventaireRequestParams {
  structureId: number;
  annee: number;
  periode: PeriodeType;
}
