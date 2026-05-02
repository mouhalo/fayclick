/**
 * Types pour le module Historique Client Public.
 *
 * Reflètent le retour JSON des fonctions PostgreSQL :
 *   - get_historique_achats_client(p_telephone, p_limit, p_offset, p_id_structure_filter)
 *   - anonymiser_achat_client(p_id_facture, p_telephone)
 *
 * Voir : docs/prd-historique-client-public-2026-05-02.md (§ 4.2 et § 4.3)
 *
 * @module types/historique
 */

/**
 * Représente un achat (facture) d'un client identifié par son téléphone.
 *
 * Construit côté PG par jointure facture_com + structures + type_structure + recus_paiement.
 * Les champs nullable correspondent aux LEFT JOIN (reçu pas encore généré, type
 * structure manquant, etc.).
 */
export interface AchatClient {
  /** Identifiant unique de la facture (PK facture_com.id_facture) */
  id_facture: number;
  /** Identifiant de la structure (boutique) émettrice */
  id_structure: number;
  /** Numéro de facture lisible (ex: "FAC-2026-1289") */
  num_facture: string;
  /** Numéro de reçu côté facture_com (peut être null si pas encore payée) */
  numrecu: string | null;
  /** Nom de la boutique (structures.nom_structure) */
  nom_structure: string;
  /** URL du logo de la boutique (peut être null si non uploadé) */
  structure_logo: string | null;
  /** Type de structure ('COMMERCIALE', 'SCOLAIRE', 'IMMOBILIER', 'PRESTATAIRE DE SERVICES') */
  type_structure: string | null;
  /** Date de la facture au format ISO (YYYY-MM-DD) */
  date_facture: string;
  /** Montant total de la facture (FCFA) */
  montant: number;
  /** Montant payé (acompte cumulé) */
  mt_acompte: number;
  /** Reste à payer (montant - mt_acompte) */
  mt_restant: number;
  /**
   * Méthode de paiement utilisée (depuis recus_paiement.methode_paiement).
   * Valeurs courantes : 'OM', 'WAVE', 'FREE', 'CASH', 'MOBILE_MONEY', etc.
   * Volontairement laissé en `string` (et non union stricte) car la BD
   * contient des valeurs legacy variées.
   * Null si aucun reçu de paiement n'est associé.
   */
  methode_paiement: string | null;
  /** Date du paiement au format ISO (peut être null si non payée) */
  date_paiement: string | null;
  /** Numéro du reçu de paiement (recus_paiement.numero_recu) */
  recu_numero: string | null;
}

/**
 * Boutique (structure) sur laquelle le client a déjà acheté.
 * Utilisée pour alimenter le dropdown de filtre (US-4 du PRD).
 */
export interface BoutiqueClient {
  /** ID structure */
  id_structure: number;
  /** Nom de la boutique */
  nom_structure: string;
}

/**
 * Métadonnées de pagination "load more" (offset/limit).
 */
export interface HistoriqueAchatsPagination {
  /** Nombre total d'achats (avec filtre boutique appliqué le cas échéant) */
  total: number;
  /** Taille de la page demandée */
  limit: number;
  /** Offset courant */
  offset: number;
  /** True si d'autres achats restent à charger */
  has_more: boolean;
}

/**
 * Payload `data` retourné par `get_historique_achats_client` quand `success === true`.
 */
export interface HistoriqueAchatsData {
  /** Liste paginée des achats (triée par date desc) */
  achats: AchatClient[];
  /** Liste exhaustive des boutiques où le client a acheté (pour filtre) */
  boutiques: BoutiqueClient[];
  /** Métadonnées pagination */
  pagination: HistoriqueAchatsPagination;
}

/**
 * Réponse complète de la fonction PG `get_historique_achats_client`.
 * `success === false` => regarder `message`. `success === true` => `data` est défini.
 */
export interface HistoriqueAchatsResponse {
  success: boolean;
  message?: string;
  data?: HistoriqueAchatsData;
}

/**
 * Payload `data` retourné par `anonymiser_achat_client` en cas de succès.
 */
export interface AnonymiserAchatData {
  /** ID facture qui a été anonymisée */
  id_facture: number;
  /** ID structure de la facture (utile pour rafraîchissement côté front) */
  id_structure: number;
}

/**
 * Réponse complète de la fonction PG `anonymiser_achat_client`.
 */
export interface AnonymiserAchatResponse {
  success: boolean;
  message: string;
  data?: AnonymiserAchatData;
}

/**
 * Paramètres d'appel pour `historiqueClientService.getHistoriqueAchats(...)`.
 */
export interface GetHistoriqueParams {
  /**
   * Téléphone du client.
   * Format accepté : 9 chiffres SN (ex: "771234567") ou E.164 (ex: "+221771234567").
   * Le backend matche `WHERE tel_client = p_telephone` strict — la valeur doit
   * donc correspondre EXACTEMENT à la valeur stockée en BD.
   */
  telephone: string;
  /** Taille de page (défaut 20) */
  limit?: number;
  /** Offset (défaut 0) */
  offset?: number;
  /**
   * Filtre par boutique (id_structure).
   * `null` ou `undefined` = pas de filtre (toutes boutiques).
   */
  id_structure_filter?: number | null;
}
