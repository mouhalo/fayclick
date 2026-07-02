/**
 * Service de vente côté Représentant
 *
 * Wrapper autour de la fonction PostgreSQL `create_facture_representant` qui :
 *   - Vérifie que les produits sont bien affectés au rep
 *   - Vérifie que le prix transmis correspond au prix_vente_rep imposé (PRIX_NON_AUTORISE sinon)
 *   - Décrémente automatiquement quantite_restante des affectations
 *   - Crée la facture avec id_representant_vendeur renseigné
 *   - Recalcule le montant_total côté serveur (source de vérité)
 *
 * Signature PG en production (Stage B3.3, réconciliée avec la DBA spec) :
 *   create_facture_representant(
 *     p_date_facture DATE,                -- ⚠️ PREMIER argument, format 'YYYY-MM-DD'
 *     p_id_structure integer,
 *     p_id_representant integer,
 *     p_tel_client text,
 *     p_nom_client_payeur text,
 *     p_articles_string text,             -- "id_produit-quantite-prix#..." (terminé par '#')
 *     p_description text DEFAULT NULL,
 *     p_mt_acompte numeric DEFAULT 0,
 *     p_mode_paiement text DEFAULT 'CASH' -- CASH | OM | WAVE | FREE
 *   ) RETURNS json
 *
 * Le prix de chaque article DOIT être exactement le prix_vente_rep de l'affectation
 * du produit au représentant (tolérance serveur 0.01) — ce service ne recalcule
 * ni n'impose ce prix, il transmet tel quel celui fourni par l'appelant.
 *
 * Codes d'erreur possibles (data.code / message serveur) :
 *   MODULE_INACTIF, REP_INVALIDE, MODE_INVALIDE, ARTICLES_VIDES,
 *   FORMAT_ARTICLES_INVALIDE, ARTICLE_NON_AFFECTE, PRIX_NON_AUTORISE,
 *   STOCK_INSUFFISANT_REP, FACTURE_ERREUR, ERROR
 *
 * Cf. docs/PRD_RESEAU_DISTRIBUTION_REPRESENTANTS.md
 * Cf. docs/dba/DBA_SPEC_RESEAU_DISTRIBUTION.md
 */

import DatabaseService from './database.service';

/**
 * Mode de paiement utilisable par le rep
 * - Si user.mode_encaissement = WALLET_STRUCTURE : seuls les modes wallet
 *   sont autorisés (le paiement va au KALPE structure)
 * - Si user.mode_encaissement = LIBRE : CASH/OM/WAVE/FREE déclaratifs
 *   (alimentent le solde dû à reverser)
 */
export type ModePaiementRep = 'CASH' | 'OM' | 'WAVE' | 'FREE';

/**
 * Article du panier rep — le prix DOIT provenir du stock affecté
 * (prix_vente_rep de l'affectation), sinon le serveur rejette avec
 * PRIX_NON_AUTORISE.
 */
export interface ArticleVenteRep {
  id_produit: number;
  quantite: number;
  prix: number;
}

export interface CreateFactureRepParams {
  date_facture: string;              // Format 'YYYY-MM-DD'
  id_structure: number;
  id_representant: number;
  tel_client: string;
  nom_client_payeur: string;
  articles: ArticleVenteRep[];
  description?: string;
  mt_acompte?: number;               // défaut 0
  mode_paiement?: ModePaiementRep;   // défaut CASH
}

export interface CreateFactureRepData {
  id_facture: number;
  reference_facture: string;
  montant_total: number;             // recalculé côté serveur
  nb_articles: number;
}

export interface CreateFactureRepResponse {
  success: boolean;
  message?: string;
  code?: string; // MODULE_INACTIF | REP_INVALIDE | MODE_INVALIDE | ARTICLES_VIDES
                 // | FORMAT_ARTICLES_INVALIDE | ARTICLE_NON_AFFECTE | PRIX_NON_AUTORISE
                 // | STOCK_INSUFFISANT_REP | FACTURE_ERREUR | ERROR
  data?: CreateFactureRepData;
}

class VenteRepresentantService {
  private static instance: VenteRepresentantService;

  static getInstance(): VenteRepresentantService {
    if (!this.instance) {
      this.instance = new VenteRepresentantService();
    }
    return this.instance;
  }

  /**
   * Construit la chaîne d'articles au format attendu par la fonction PG :
   * "id_produit-quantite-prix#id_produit-quantite-prix#..." (terminée par '#')
   */
  private buildArticlesString(articles: ArticleVenteRep[]): string {
    return (
      articles
        .map((a) => {
          // Coercition + rejet NaN : garantit que la chaîne SQL ne contient
          // que des valeurs numériques (défense-en-profondeur SQLi).
          const id = Number(a.id_produit);
          const qty = Number(a.quantite);
          const prix = Number(a.prix);
          if (![id, qty, prix].every(Number.isFinite)) {
            throw new Error(
              `Article invalide (valeurs non numériques): ${JSON.stringify(a)}`
            );
          }
          return `${id}-${qty}-${prix}`;
        })
        .join('#') + '#'
    );
  }

  async createFacture(params: CreateFactureRepParams): Promise<CreateFactureRepResponse> {
    if (!params.date_facture) {
      throw new Error('Date de facture manquante');
    }
    if (
      !Number.isFinite(Number(params.id_structure)) ||
      !Number.isFinite(Number(params.id_representant))
    ) {
      throw new Error('Structure ou représentant invalide');
    }
    if (!params.articles || params.articles.length === 0) {
      throw new Error('Aucun article dans le panier');
    }

    // Garde-fou client (le serveur reste seul arbitre : recalcul montant,
    // vérification prix imposé et disponibilité stock affecté)
    for (const a of params.articles) {
      if (!a.id_produit || a.quantite <= 0) {
        throw new Error(`Quantité invalide pour l'article ${a.id_produit}`);
      }
      if (!a.prix || a.prix <= 0) {
        throw new Error(`Prix invalide pour l'article ${a.id_produit}`);
      }
    }

    // Whitelist du mode de paiement (défense-en-profondeur : mode interpolé en SQL)
    const MODES_AUTORISES = ['CASH', 'OM', 'WAVE', 'FREE'] as const;
    const mode = MODES_AUTORISES.includes(
      params.mode_paiement as (typeof MODES_AUTORISES)[number]
    )
      ? params.mode_paiement!
      : 'CASH';
    const mtAcompte = Number.isFinite(Number(params.mt_acompte))
      ? Number(params.mt_acompte)
      : 0;

    const articlesString = this.buildArticlesString(params.articles);

    const dateFacture = params.date_facture.replace(/'/g, "''");
    const tel = (params.tel_client || '771234567').replace(/'/g, "''");
    const nom = (params.nom_client_payeur || 'CLIENT_ANONYME').replace(/'/g, "''");
    const descParam = params.description
      ? `'${params.description.replace(/'/g, "''")}'`
      : 'NULL';

    const query = `SELECT * FROM create_facture_representant(
      '${dateFacture}',
      ${params.id_structure},
      ${params.id_representant},
      '${tel}',
      '${nom}',
      '${articlesString}',
      ${descParam},
      ${mtAcompte},
      '${mode}'
    );`;

    try {
      const result = await DatabaseService.query(query);
      if (!Array.isArray(result) || result.length === 0) {
        return { success: false, message: 'Aucune réponse du serveur' };
      }
      const first = result[0] as Record<string, unknown>;

      const raw = first.create_facture_representant;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (parsed && typeof parsed === 'object') {
        return parsed as CreateFactureRepResponse;
      }

      return { success: false, message: 'Format de réponse non reconnu' };
    } catch (error) {
      console.error('[VENTE REP SERVICE] Erreur createFacture:', error);
      throw new Error(
        `Impossible de créer la facture: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }
}

export default VenteRepresentantService.getInstance();
