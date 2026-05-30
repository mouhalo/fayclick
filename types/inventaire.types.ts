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
 * Résumé des marges réalisées sur la période avec variation vs N-1
 * Source : fonction PG get_inventaire_periodique v2 (clé `resume_marges`)
 *
 * Règles métier :
 * - marge_total : somme des marges brutes réalisées (prorata sur acomptes appliqué), en FCFA entier
 * - marge_variation : pourcentage de variation vs période précédente
 *   - null si N-1 = 0 et N > 0 (progression depuis zéro → afficher "—" côté UI)
 *   - valeur signée sinon (peut être négative ou très grande)
 */
export interface ResumeMarges {
  marge_total: number;
  marge_variation: number | null;
}

/**
 * Point de données pour le graphique d'évolution des marges
 * Source : fonction PG get_inventaire_periodique v2 (clé `evolution_marges`)
 *
 * Invariants garantis par le DBA :
 * - evolution_marges.length === evolution_ventes.length
 * - evolution_marges[i].periode === evolution_ventes[i].periode
 * - evolution_marges[i].label === evolution_ventes[i].label
 */
export interface EvolutionMarge {
  periode: string;       // Identique à evolution_ventes[i].periode (Mon, S23, Jan...)
  label: string;         // Identique à evolution_ventes[i].label (13/05, ...)
  marge: number;         // Marge brute réalisée sur le bucket, en FCFA entier
  nombre_ventes: number; // Nombre de factures encaissées sur le bucket
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
  /**
   * NOUVEAU v2 — optionnel pour rétrocompatibilité avec d'anciens clients PWA
   * mis en cache avant le déploiement de la fonction PG v2.
   */
  resume_marges?: ResumeMarges;
  /**
   * NOUVEAU v2 — optionnel pour rétrocompatibilité. Voir ResumeMarges.
   */
  evolution_marges?: EvolutionMarge[];
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
