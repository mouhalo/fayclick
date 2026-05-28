/**
 * Service de gestion des Bons de Commande Fournisseurs (EPIC 2 — comptes prives)
 *
 * Source de verite : docs/dba/bon-commande-spec.md (v1.0)
 *
 * Pattern : singleton, cache 5 min sur getListBonsCommandes, invalidation apres mutations.
 * Securite : id_structure obligatoire (depuis authService.getUser()).
 * Errors  : BonCommandeApiException.
 *
 * Differences cle vs ProformaService :
 * - Prix unitaire = cout_revient (pas prix_vente). Le store panierBonCommande resout via prix_applique.
 * - PAS de conversion vers facture (BC reste un document d'engagement)
 * - PAS de mouvement de stock automatique (reception manuelle via Inventaire)
 * - 4 statuts (BROUILLON / CONFIRME / LIVRE / ANNULE) avec matrice de transitions stricte
 */

import { authService } from './auth.service';
import DatabaseService from './database.service';
import SecurityService from './security.service';
import { ArticlePanier } from '@/types/produit';
import {
  BC_STATUT_TO_ID,
  BonCommande,
  BonCommandeActionResponse,
  BonCommandeComplete,
  BonCommandeListResponse,
  BonCommandeStatut,
  CreateBonCommandeResponse,
} from '@/types/bon-commande';

export class BonCommandeApiException extends Error {
  constructor(message: string, public statusCode: number = 500, public originalError?: unknown) {
    super(message);
    this.name = 'BonCommandeApiException';
  }
}

// Type input pour edition (champs optionnels)
export interface EditBonCommandeInput {
  articles?: ArticlePanier[];
  fournisseurInfo?: {
    id_fournisseur?: number;
    description?: string;
    date_bon_commande?: string;       // ISO date "YYYY-MM-DD"
  };
  montants?: {
    sous_total?: number;
    remise?: number;
    montant_net?: number;
  };
  nouveauStatut?: BonCommandeStatut;
}

class BonCommandeService {
  private static instance: BonCommandeService;
  private listCache: { data: BonCommandeListResponse | null; timestamp: number } = {
    data: null,
    timestamp: 0,
  };
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 min

  static getInstance(): BonCommandeService {
    if (!this.instance) {
      this.instance = new BonCommandeService();
    }
    return this.instance;
  }

  /**
   * Invalider le cache liste (apres mutation)
   */
  invalidateCache(): void {
    this.listCache = { data: null, timestamp: 0 };
  }

  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Convertit un ArticlePanier en chaine "id-qty-cout"
   * Utilise prix_applique (resolu par le store avec fallback cout_revient -> prix_vente).
   */
  private articleToString(article: ArticlePanier): string {
    const prix = article.prix_applique ?? article.cout_revient ?? article.prix_vente ?? 0;
    return `${article.id_produit}-${article.quantity}-${prix}`;
  }

  /**
   * Construit le format articles_string attendu par PG :
   *   "id-qty-prix#id-qty-prix#"
   * Le # final est obligatoire (trailing separator).
   */
  private buildArticlesString(articles: ArticlePanier[]): string {
    return articles.map((a) => this.articleToString(a)).join('#') + '#';
  }

  // ============================================================================
  // CREATE
  // ============================================================================

  /**
   * Creer un nouveau bon de commande.
   * - Statut initial : BROUILLON (id_etat=1)
   * - Pas de mouvement de stock automatique
   *
   * @param articles    Articles du panier (prix_applique = cout_revient resolu)
   * @param fournisseurInfo { id_fournisseur, description?, date_bon_commande? }
   * @param montants    { remise? } — sous_total et montant_net sont recalcules en interne
   */
  async createBonCommande(
    articles: ArticlePanier[],
    fournisseurInfo: { id_fournisseur: number; description?: string; date_bon_commande?: string },
    montants: { remise?: number }
  ): Promise<CreateBonCommandeResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new BonCommandeApiException('Utilisateur non authentifie', 401);

      if (!articles || articles.length === 0) {
        throw new BonCommandeApiException('Aucun article selectionne', 400);
      }

      if (!fournisseurInfo.id_fournisseur || fournisseurInfo.id_fournisseur <= 0) {
        throw new BonCommandeApiException('Fournisseur obligatoire pour un bon de commande', 400);
      }

      // Calcul sous-total : on utilise prix_applique (= cout_revient resolu)
      const sousTotal = articles.reduce((total, a) => {
        const prix = a.prix_applique ?? a.cout_revient ?? a.prix_vente ?? 0;
        return total + prix * a.quantity;
      }, 0);

      const remise = montants.remise ?? 0;
      if (remise < 0) {
        throw new BonCommandeApiException('La remise ne peut pas etre negative', 400);
      }
      if (remise > sousTotal) {
        throw new BonCommandeApiException('La remise ne peut pas etre superieure au sous-total', 400);
      }

      const montantNet = sousTotal - remise;
      if (montantNet < 0) {
        throw new BonCommandeApiException('Le montant net doit etre superieur ou egal a 0', 400);
      }

      // Construire la string articles
      const articlesString = this.buildArticlesString(articles);

      // Description par defaut
      const descriptionRaw = fournisseurInfo.description?.trim() || `BC ${articles.length} article(s)`;
      const description = `'${this.escapeSql(descriptionRaw)}'`;

      // Date (defaut : aujourd'hui)
      const dateBC = fournisseurInfo.date_bon_commande
        ? `'${this.escapeSql(fournisseurInfo.date_bon_commande)}'::DATE`
        : `CURRENT_DATE`;

      const query = `SELECT create_bon_commande(
        ${user.id_structure},
        ${dateBC},
        ${fournisseurInfo.id_fournisseur},
        ${description},
        ${montantNet},
        '${this.escapeSql(articlesString)}',
        ${remise},
        ${user.id ?? 0}
      )`;

      SecurityService.secureLog('log', 'Creation bon de commande', {
        id_structure: user.id_structure,
        id_fournisseur: fournisseurInfo.id_fournisseur,
        montant_net: montantNet,
        nb_articles: articles.length,
      });

      const result = await DatabaseService.query(query);
      if (!result || result.length === 0) {
        throw new BonCommandeApiException('Aucune reponse de create_bon_commande', 500);
      }

      const raw = (result[0] as Record<string, unknown>).create_bon_commande;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!parsed?.success) {
        throw new BonCommandeApiException(parsed?.message || 'Erreur creation bon de commande', 400);
      }

      this.invalidateCache();

      SecurityService.secureLog('log', 'Bon de commande cree', {
        id_bon_commande: parsed.id_bon_commande,
        num_bc: parsed.num_bc,
      });

      return parsed as CreateBonCommandeResponse;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur creation bon de commande', error);
      if (error instanceof BonCommandeApiException) throw error;
      throw new BonCommandeApiException('Impossible de creer le bon de commande', 500, error);
    }
  }

  // ============================================================================
  // LIST (cache 5 min)
  // ============================================================================

  /**
   * Lister tous les BC de la structure courante (tous statuts) + resume agrege.
   */
  async getListBonsCommandes(forceRefresh: boolean = false): Promise<BonCommandeListResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new BonCommandeApiException('Utilisateur non authentifie', 401);

      if (
        !forceRefresh &&
        this.listCache.data &&
        Date.now() - this.listCache.timestamp < this.CACHE_DURATION
      ) {
        return this.listCache.data;
      }

      const query = `SELECT get_list_bons_commandes(${user.id_structure})`;
      const result = await DatabaseService.query(query);

      if (!result || result.length === 0) {
        const empty: BonCommandeListResponse = {
          success: true,
          bons_commandes: [],
          resume: {
            total_bcs: 0,
            nb_brouillons: 0,
            nb_confirmes: 0,
            nb_livres: 0,
            nb_annules: 0,
            montant_en_attente: 0,
            montant_total_livre: 0,
          },
        };
        this.listCache = { data: empty, timestamp: Date.now() };
        return empty;
      }

      const raw = (result[0] as Record<string, unknown>).get_list_bons_commandes;
      const parsed: BonCommandeListResponse = typeof raw === 'string' ? JSON.parse(raw) : raw;

      // Normalisation defensive
      const normalized: BonCommandeListResponse = {
        success: parsed?.success ?? true,
        bons_commandes: Array.isArray(parsed?.bons_commandes) ? parsed.bons_commandes : [],
        resume: parsed?.resume ?? {
          total_bcs: 0,
          nb_brouillons: 0,
          nb_confirmes: 0,
          nb_livres: 0,
          nb_annules: 0,
          montant_en_attente: 0,
          montant_total_livre: 0,
        },
      };

      this.listCache = { data: normalized, timestamp: Date.now() };
      return normalized;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur liste bons de commande', error);
      if (error instanceof BonCommandeApiException) throw error;
      throw new BonCommandeApiException('Impossible de recuperer les bons de commande', 500, error);
    }
  }

  // ============================================================================
  // GET DETAILS
  // ============================================================================

  /**
   * Recuperer le detail complet d'un BC (entete + fournisseur enrichi + articles).
   * @throws BonCommandeApiException si BC introuvable ou acces refuse
   */
  async getBonCommandeDetails(idBC: number): Promise<BonCommandeComplete> {
    try {
      const user = authService.getUser();
      if (!user) throw new BonCommandeApiException('Utilisateur non authentifie', 401);

      const query = `SELECT get_bon_commande_details(${idBC}, ${user.id_structure})`;
      const result = await DatabaseService.query(query);

      if (!result || result.length === 0) {
        throw new BonCommandeApiException('Bon de commande introuvable', 404);
      }

      const raw = (result[0] as Record<string, unknown>).get_bon_commande_details;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!parsed?.success) {
        throw new BonCommandeApiException(
          parsed?.message || 'Bon de commande introuvable',
          404
        );
      }

      return parsed as BonCommandeComplete;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur details bon de commande', error);
      if (error instanceof BonCommandeApiException) throw error;
      throw new BonCommandeApiException('Impossible de recuperer les details', 500, error);
    }
  }

  // ============================================================================
  // EDIT
  // ============================================================================

  /**
   * Modifier un BC existant. Tous champs optionnels (NULL = inchange PG).
   * Refuse si statut LIVRE ou ANNULE (cote PG).
   * Si articles fournis : remplacement COMPLET des lignes.
   */
  async editBonCommande(
    idBC: number,
    input: EditBonCommandeInput
  ): Promise<BonCommandeActionResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new BonCommandeApiException('Utilisateur non authentifie', 401);

      // p_date_bon_commande (DATE)
      const dateParam = input.fournisseurInfo?.date_bon_commande
        ? `'${this.escapeSql(input.fournisseurInfo.date_bon_commande)}'::DATE`
        : 'NULL';

      // p_id_fournisseur (INTEGER) — si fourni, PG re-snapshote les coords du fournisseur
      const idFournisseurParam =
        input.fournisseurInfo?.id_fournisseur !== undefined
          ? `${input.fournisseurInfo.id_fournisseur}`
          : 'NULL';

      // p_description (TEXT)
      const descriptionParam =
        input.fournisseurInfo?.description !== undefined
          ? `'${this.escapeSql(input.fournisseurInfo.description)}'`
          : 'NULL';

      // p_montant_net (NUMERIC) — recalcule si possible
      let montantNetParam = 'NULL';
      const remiseVal = input.montants?.remise;
      if (input.montants?.montant_net !== undefined) {
        montantNetParam = `${input.montants.montant_net}`;
      } else if (input.montants?.sous_total !== undefined) {
        const remise = remiseVal ?? 0;
        montantNetParam = `${input.montants.sous_total - remise}`;
      }

      // p_articles_string (TEXT) — remplacement complet
      let articlesParam = 'NULL';
      if (input.articles && input.articles.length > 0) {
        const str = this.buildArticlesString(input.articles);
        articlesParam = `'${this.escapeSql(str)}'`;
      }

      // p_mt_remise (NUMERIC)
      const remiseParam = remiseVal !== undefined ? `${remiseVal}` : 'NULL';

      // p_id_etat (INTEGER) — converti depuis libelle
      let idEtatParam = 'NULL';
      if (input.nouveauStatut !== undefined) {
        const idEtat = BC_STATUT_TO_ID[input.nouveauStatut];
        if (!idEtat) {
          throw new BonCommandeApiException(
            `Statut invalide : ${input.nouveauStatut}`,
            400
          );
        }
        idEtatParam = `${idEtat}`;
      }

      const query = `SELECT edit_bon_commande(
        ${idBC},
        ${user.id_structure},
        ${dateParam},
        ${idFournisseurParam},
        ${descriptionParam},
        ${montantNetParam},
        ${articlesParam},
        ${remiseParam},
        ${idEtatParam}
      )`;

      const result = await DatabaseService.query(query);
      if (!result || result.length === 0) {
        throw new BonCommandeApiException('Aucune reponse de edit_bon_commande', 500);
      }

      const raw = (result[0] as Record<string, unknown>).edit_bon_commande;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!parsed?.success) {
        throw new BonCommandeApiException(
          parsed?.message || 'Erreur modification bon de commande',
          400
        );
      }

      this.invalidateCache();
      return parsed as BonCommandeActionResponse;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur edition bon de commande', error);
      if (error instanceof BonCommandeApiException) throw error;
      throw new BonCommandeApiException('Impossible de modifier le bon de commande', 500, error);
    }
  }

  // ============================================================================
  // DELETE (physique — cascade sur details)
  // ============================================================================

  /**
   * Supprimer physiquement un BC (cascade sur bon_commande_details).
   * Refus cote PG si statut = LIVRE.
   */
  async deleteBonCommande(idBC: number): Promise<BonCommandeActionResponse> {
    try {
      const user = authService.getUser();
      if (!user) throw new BonCommandeApiException('Utilisateur non authentifie', 401);

      const query = `SELECT delete_bon_commande(${idBC}, ${user.id_structure})`;
      const result = await DatabaseService.query(query);

      if (!result || result.length === 0) {
        throw new BonCommandeApiException('Aucune reponse de delete_bon_commande', 500);
      }

      const raw = (result[0] as Record<string, unknown>).delete_bon_commande;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!parsed?.success) {
        throw new BonCommandeApiException(
          parsed?.message || 'Erreur suppression bon de commande',
          400
        );
      }

      this.invalidateCache();
      return parsed as BonCommandeActionResponse;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur suppression bon de commande', error);
      if (error instanceof BonCommandeApiException) throw error;
      throw new BonCommandeApiException('Impossible de supprimer le bon de commande', 500, error);
    }
  }

  // ============================================================================
  // UPDATE STATUT (raccourci sur editBonCommande)
  // ============================================================================

  /**
   * Changer uniquement le statut d'un BC.
   * Wrap sur editBonCommande pour exposer une API claire cote UI Phase 5.
   * La matrice de transitions est verifiee cote PG (refus si transition invalide).
   */
  async updateStatut(
    idBC: number,
    nouveauStatut: BonCommandeStatut
  ): Promise<BonCommandeActionResponse> {
    return this.editBonCommande(idBC, { nouveauStatut });
  }

  /**
   * Acces lecture seule au cache courant (utile pour synchronisation UI).
   */
  getCachedList(): BonCommandeListResponse | null {
    return this.listCache.data;
  }

  /**
   * Recuperer un BC depuis le cache par ID (sans appel reseau).
   */
  getCachedBC(idBC: number): BonCommande | undefined {
    return this.listCache.data?.bons_commandes.find((bc) => bc.id_bon_commande === idBC);
  }
}

// Export singleton — l'import par defaut EST l'instance, pas la classe
export const bonCommandeService = BonCommandeService.getInstance();
export default bonCommandeService;
