/**
 * Types pour le module d'affectation de stock aux représentants (Stage B1)
 *
 * Fonctions PG (signatures PROD réconciliées — cf.
 * docs/superpowers/plans/2026-07-01-representants-stock-b1.md) :
 *   - affecter_produit_representant(p_id_structure, p_id_produit, p_id_representant,
 *       p_quantite, p_prix_vente_rep, p_seuil_alerte=NULL, p_motif=NULL, p_id_admin=0)
 *   - retirer_stock_representant(p_id_affectation, p_quantite, p_motif, p_id_admin)
 *   - modifier_prix_rep(p_id_affectation, p_nouveau_prix, p_motif=NULL, p_id_admin=0)
 *   - get_stock_representant(p_id_rep, p_id_structure=NULL)
 */

/**
 * Ligne de stock affecté à un représentant (retournée par get_stock_representant)
 */
export interface AffectationData {
  id_affectation: number;
  id_produit: number;
  nom_produit: string;
  nom_categorie?: string;

  /** Cumul historique reçu (additionné à chaque ré-affectation) */
  quantite_affectee: number;
  /** Stock courant chez le rep */
  quantite_restante: number;
  /** Prix de vente imposé pour CE rep */
  prix_vente_rep: number;
  /** Seuil d'alerte stock bas (NULL/0 = pas d'alerte) */
  seuil_alerte_stock?: number;
  /** Calculé côté PG : quantite_restante <= seuil_alerte_stock */
  alerte_stock_bas: boolean;
  /** quantite_restante * prix_vente_rep (ou coût, selon PG) */
  valeur_stock_restant: number;

  date_derniere_maj: string;
  photo_disponible?: boolean;
  code_barre?: string;
  id_unite?: number;
}

/**
 * Paramètres pour affecter_produit_representant()
 */
export interface AffecterProduitParams {
  id_structure: number;
  id_produit: number;
  id_representant: number;
  quantite: number;
  prix_vente_rep: number;
  seuil_alerte_stock?: number;
  motif?: string;
  id_admin: number;
}

/**
 * Paramètres pour retirer_stock_representant()
 * Signature PROD : 4 args, motif OBLIGATOIRE, pas de id_structure.
 */
export interface RetirerStockParams {
  id_affectation: number;
  quantite: number;
  motif: string;
  id_admin: number;
}

/**
 * Paramètres pour modifier_prix_rep()
 */
export interface ModifierPrixRepParams {
  id_affectation: number;
  nouveau_prix: number;
  motif?: string;
  id_admin: number;
}

/**
 * Réponse standard d'une opération sur affectation (affecter/retirer/modifier prix)
 */
export interface AffectationOperationResponse {
  success: boolean;
  /** Code d'erreur métier : MODULE_INACTIF, REP_INVALIDE, PRODUIT_INVALIDE,
   *  STOCK_INSUFFISANT, QUANTITE_INVALIDE, PRIX_INVALIDE, ... */
  code?: string;
  message: string;
  data?: {
    id_affectation?: number;
    /** affecter_produit_representant */
    quantite_affectee?: number;
    stock_global_restant?: number;
    /** retirer_stock_representant */
    quantite_retiree?: number;
    nouvelle_restante?: number;
    /** modifier_prix_rep */
    ancien_prix?: number;
    nouveau_prix?: number;
  };
}

/**
 * Réponse de get_stock_representant() : { success, data: { produits, total_produits, valeur_totale_stock } }
 */
export interface StockRepresentantResponse {
  success: boolean;
  message?: string;
  produits: AffectationData[];
  total_produits: number;
  valeur_totale_stock: number;
}

/**
 * Helper : valeur totale du stock affecté (au prix de vente rep), si non fournie par PG
 */
export function getValeurStockAffecte(aff: AffectationData): number {
  return aff.quantite_restante * aff.prix_vente_rep;
}

/**
 * Helper : indique si le stock est bas (selon seuil_alerte_stock)
 */
export function isStockBas(aff: AffectationData): boolean {
  if (aff.alerte_stock_bas) return true;
  if (!aff.seuil_alerte_stock || aff.seuil_alerte_stock <= 0) return false;
  return aff.quantite_restante <= aff.seuil_alerte_stock;
}
