/**
 * Service de gestion des affectations de stock aux représentants (Stage B1)
 *
 * Appelle les fonctions PostgreSQL (signatures PROD réconciliées) :
 *   - affecter_produit_representant(p_id_structure, p_id_produit, p_id_representant,
 *       p_quantite, p_prix_vente_rep, p_seuil_alerte=NULL, p_motif=NULL, p_id_admin=0)
 *   - retirer_stock_representant(p_id_affectation, p_quantite, p_motif, p_id_admin)
 *   - modifier_prix_rep(p_id_affectation, p_nouveau_prix, p_motif=NULL, p_id_admin=0)
 *   - get_stock_representant(p_id_rep) — p_id_structure optionnel, omis ici
 *
 * Pattern miroir de representant.service.ts (singleton + parsing robuste).
 *
 * Cf. docs/superpowers/plans/2026-07-01-representants-stock-b1.md
 */

import DatabaseService from './database.service';
import {
  AffecterProduitParams,
  RetirerStockParams,
  ModifierPrixRepParams,
  AffectationOperationResponse,
  StockRepresentantResponse,
  AffectationData,
} from '@/types/affectation';

class AffectationService {
  private static instance: AffectationService;

  static getInstance(): AffectationService {
    if (!this.instance) {
      this.instance = new AffectationService();
    }
    return this.instance;
  }

  // ────────────────────────────────────────────────────────────
  // AFFECTER (crée ou augmente une affectation existante — UPSERT additionne)
  // ────────────────────────────────────────────────────────────

  async affecterProduit(
    params: AffecterProduitParams
  ): Promise<AffectationOperationResponse> {
    this.validateAffecter(params);

    const seuil =
      params.seuil_alerte_stock !== undefined && params.seuil_alerte_stock !== null
        ? params.seuil_alerte_stock.toString()
        : 'NULL';
    const motif = params.motif
      ? `'${params.motif.replace(/'/g, "''")}'`
      : 'NULL';

    const query = `SELECT * FROM affecter_produit_representant(
      ${params.id_structure},
      ${params.id_produit},
      ${params.id_representant},
      ${params.quantite},
      ${params.prix_vente_rep},
      ${seuil},
      ${motif},
      ${params.id_admin}
    );`;

    try {
      const results = await DatabaseService.query(query);
      return this.parseOperationResponse(results, 'affecter_produit_representant');
    } catch (error) {
      console.error('[AFFECTATION SERVICE] Erreur affecterProduit:', error);
      throw new Error(
        `Impossible d'affecter le produit: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }

  // ────────────────────────────────────────────────────────────
  // RETIRER (mouvement RETOUR — motif obligatoire, pas de id_structure)
  // ────────────────────────────────────────────────────────────

  async retirerStock(
    params: RetirerStockParams
  ): Promise<AffectationOperationResponse> {
    if (!params.id_affectation || params.id_affectation <= 0) {
      throw new Error('Affectation invalide');
    }
    if (typeof params.quantite !== 'number' || params.quantite <= 0) {
      throw new Error('La quantité à retirer doit être strictement positive');
    }
    if (!params.motif || params.motif.trim().length < 3) {
      throw new Error('Le motif est obligatoire (3 caractères minimum)');
    }
    if (!params.id_admin || params.id_admin <= 0) {
      throw new Error('Administrateur invalide');
    }

    const motif = `'${params.motif.replace(/'/g, "''")}'`;
    const query = `SELECT * FROM retirer_stock_representant(
      ${params.id_affectation},
      ${params.quantite},
      ${motif},
      ${params.id_admin}
    );`;

    try {
      const results = await DatabaseService.query(query);
      return this.parseOperationResponse(results, 'retirer_stock_representant');
    } catch (error) {
      console.error('[AFFECTATION SERVICE] Erreur retirerStock:', error);
      throw new Error(
        `Impossible de retirer le stock: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }

  // ────────────────────────────────────────────────────────────
  // MODIFIER PRIX
  // ────────────────────────────────────────────────────────────

  async modifierPrix(
    params: ModifierPrixRepParams
  ): Promise<AffectationOperationResponse> {
    if (!params.id_affectation || params.id_affectation <= 0) {
      throw new Error('Affectation invalide');
    }
    if (typeof params.nouveau_prix !== 'number' || params.nouveau_prix <= 0) {
      throw new Error('Le nouveau prix doit être strictement positif');
    }
    if (!params.id_admin || params.id_admin <= 0) {
      throw new Error('Administrateur invalide');
    }

    const motif = params.motif
      ? `'${params.motif.replace(/'/g, "''")}'`
      : 'NULL';
    const query = `SELECT * FROM modifier_prix_rep(
      ${params.id_affectation},
      ${params.nouveau_prix},
      ${motif},
      ${params.id_admin}
    );`;

    try {
      const results = await DatabaseService.query(query);
      return this.parseOperationResponse(results, 'modifier_prix_rep');
    } catch (error) {
      console.error('[AFFECTATION SERVICE] Erreur modifierPrix:', error);
      throw new Error(
        `Impossible de modifier le prix: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }

  // ────────────────────────────────────────────────────────────
  // GET STOCK REP (p_id_structure optionnel côté PG — omis ici)
  // ────────────────────────────────────────────────────────────

  async getStockRepresentant(id_rep: number): Promise<StockRepresentantResponse> {
    const query = `SELECT * FROM get_stock_representant(${id_rep});`;
    try {
      const results = await DatabaseService.query(query);
      return this.parseStockResponse(results);
    } catch (error) {
      console.error('[AFFECTATION SERVICE] Erreur getStockRepresentant:', error);
      throw new Error(
        `Impossible de récupérer le stock du représentant: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }

  // ────────────────────────────────────────────────────────────
  // VALIDATION
  // ────────────────────────────────────────────────────────────

  private validateAffecter(params: AffecterProduitParams): void {
    if (!params.id_structure || params.id_structure <= 0) {
      throw new Error('Structure invalide');
    }
    if (!params.id_produit || params.id_produit <= 0) {
      throw new Error('Produit invalide');
    }
    if (!params.id_representant || params.id_representant <= 0) {
      throw new Error('Représentant invalide');
    }
    if (typeof params.quantite !== 'number' || params.quantite <= 0) {
      throw new Error('La quantité doit être strictement positive');
    }
    if (typeof params.prix_vente_rep !== 'number' || params.prix_vente_rep <= 0) {
      throw new Error('Le prix de vente imposé doit être strictement positif');
    }
    if (
      params.seuil_alerte_stock !== undefined &&
      params.seuil_alerte_stock !== null &&
      params.seuil_alerte_stock < 0
    ) {
      throw new Error("Le seuil d'alerte ne peut pas être négatif");
    }
    if (!params.id_admin || params.id_admin <= 0) {
      throw new Error('Administrateur invalide');
    }
  }

  // ────────────────────────────────────────────────────────────
  // PARSING
  // ────────────────────────────────────────────────────────────

  /**
   * Parse la réponse de get_stock_representant() : supporte plusieurs formats PG
   *   A. [{ get_stock_representant: { success, data: { produits, total_produits, valeur_totale_stock } } }]
   *   B. [{ get_stock_representant: { success, produits, total_produits, valeur_totale_stock } }]
   *   C. [{ get_stock_representant: '<json string>' }] (idem A/B en TEXT)
   *   D. [{ ...produit1 }, { ...produit2 }] (RETURNS SETOF / TABLE, fallback)
   */
  private parseStockResponse(results: unknown): StockRepresentantResponse {
    const empty: StockRepresentantResponse = {
      success: true,
      produits: [],
      total_produits: 0,
      valeur_totale_stock: 0,
    };

    if (!Array.isArray(results) || results.length === 0) {
      return empty;
    }

    const first = results[0] as Record<string, unknown>;

    if ('get_stock_representant' in first) {
      const raw = first.get_stock_representant;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>;
        const success = obj.success !== false;
        const message = typeof obj.message === 'string' ? obj.message : undefined;

        // Niveau 1 : { success, produits, total_produits, valeur_totale_stock }
        if (Array.isArray(obj.produits)) {
          return {
            success,
            message,
            produits: obj.produits as AffectationData[],
            total_produits:
              typeof obj.total_produits === 'number'
                ? obj.total_produits
                : (obj.produits as unknown[]).length,
            valeur_totale_stock:
              typeof obj.valeur_totale_stock === 'number' ? obj.valeur_totale_stock : 0,
          };
        }

        // Niveau 2 : { success, data: { produits, total_produits, valeur_totale_stock } }
        const data = obj.data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const inner = data as Record<string, unknown>;
          if (Array.isArray(inner.produits)) {
            return {
              success,
              message,
              produits: inner.produits as AffectationData[],
              total_produits:
                typeof inner.total_produits === 'number'
                  ? inner.total_produits
                  : (inner.produits as unknown[]).length,
              valeur_totale_stock:
                typeof inner.valeur_totale_stock === 'number' ? inner.valeur_totale_stock : 0,
            };
          }
        }

        // data directement array (fallback)
        if (Array.isArray(data)) {
          return {
            success,
            message,
            produits: data as AffectationData[],
            total_produits: (data as unknown[]).length,
            valeur_totale_stock: 0,
          };
        }

        console.warn('[AFFECTATION SERVICE] Réponse JSON inattendue:', obj);
        return empty;
      }

      return empty;
    }

    // Cas D : SET OF / TABLE — chaque ligne est un produit affecté
    const produits = results as AffectationData[];
    return {
      success: true,
      produits,
      total_produits: produits.length,
      valeur_totale_stock: produits.reduce(
        (sum, p) => sum + (p.valeur_stock_restant ?? 0),
        0
      ),
    };
  }

  private parseOperationResponse(
    results: unknown,
    fnName: string
  ): AffectationOperationResponse {
    if (!Array.isArray(results) || results.length === 0) {
      return { success: false, message: 'Aucune réponse du serveur' };
    }
    const first = results[0] as Record<string, unknown>;

    if (fnName in first) {
      const raw = first[fnName];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === 'object') {
        return parsed as AffectationOperationResponse;
      }
    }

    if ('success' in first || 'message' in first) {
      return first as unknown as AffectationOperationResponse;
    }

    return { success: false, message: 'Format de réponse non reconnu' };
  }
}

export default AffectationService.getInstance();
