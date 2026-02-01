/**
 * Service Online Seller - Vente en ligne via QR Code / Lien public
 * Opérations publiques (sans authentification) :
 * - Récupération données produit
 * - Vérification stock
 * - Création facture + enregistrement paiement
 */

import DatabaseService from './database.service';

export class OnlineSellerException extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'OnlineSellerException';
  }
}

export interface PhotoProduit {
  id_photo: number;
  url_photo: string;
}

export interface ProduitPublic {
  id_produit: number;
  nom_produit: string;
  prix_vente: number;
  description: string;
  niveau_stock: number;
  nom_categorie: string;
  photo_disponible: boolean;
  logo_structure: string | null;
  photos: PhotoProduit[];
}

export interface CreateFactureOnlineParams {
  id_structure: number;
  id_produit: number;
  quantite: number;
  prenom: string;
  telephone: string;
  montant: number;
  transaction_id: string;
  uuid: string;
  mode_paiement: 'OM' | 'WAVE';
}

export interface ArticlePanier {
  id_produit: number;
  nom_produit: string;
  prix_vente: number;
  quantite: number;
  stock_disponible: number;
}

export interface CreateFactureOnlinePanierParams {
  id_structure: number;
  articles: ArticlePanier[];
  prenom: string;
  telephone: string;
  montant_total: number;
  transaction_id: string;
  uuid: string;
  mode_paiement: 'OM' | 'WAVE';
}

export interface CreateFactureOnlineResult {
  success: boolean;
  id_facture: number;
  num_facture: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  acompte?: any;
}

class OnlineSellerService {
  private static instance: OnlineSellerService;

  static getInstance(): OnlineSellerService {
    if (!this.instance) {
      this.instance = new OnlineSellerService();
    }
    return this.instance;
  }

  /**
   * Récupère les données publiques d'un produit + nom de la structure
   * Ne retourne PAS de données sensibles (cout_revient, marge, etc.)
   */
  async getProduitPublic(
    idStructure: number,
    idProduit: number
  ): Promise<{ produit: ProduitPublic; nom_structure: string; logo_structure: string | null }> {
    try {
      if (!idStructure || !idProduit || isNaN(idStructure) || isNaN(idProduit)) {
        throw new OnlineSellerException('Paramètres invalides', 400);
      }

      const query = `
        SELECT
          id_produit,
          nom_produit,
          prix_vente,
          description,
          niveau_stock,
          nom_categorie,
          photo_disponible,
          photos,
          nom_structure,
          logo
        FROM list_produits
        WHERE id_structure = ${idStructure}
          AND id_produit = ${idProduit}
      `;
      console.log('📤 [ONLINE-SELLER] Requête produit public:', query);

      const data = await DatabaseService.query(query);

      if (!data || data.length === 0) {
        throw new OnlineSellerException('Produit introuvable', 404);
      }

      const row = data[0] as Record<string, unknown>;

      console.log('✅ [ONLINE-SELLER] Produit récupéré:', {
        id_produit: row.id_produit,
        nom_produit: row.nom_produit
      });

      return {
        produit: {
          id_produit: row.id_produit as number,
          nom_produit: row.nom_produit as string,
          prix_vente: Number(row.prix_vente) || 0,
          description: (row.description as string) || '',
          niveau_stock: Number(row.niveau_stock) || 0,
          nom_categorie: (row.nom_categorie as string) || '',
          photo_disponible: Boolean(row.photo_disponible),
          logo_structure: (row.logo as string) || null,
          photos: (() => {
            const raw = row.photos;
            if (!raw) return [];
            if (Array.isArray(raw)) return raw;
            if (typeof raw === 'string') {
              try { return JSON.parse(raw); } catch {
                // Simple URL string — wrap as PhotoProduit
                return [{ id_photo: 0, url_photo: raw }];
              }
            }
            return [];
          })()
        },
        nom_structure: (row.nom_structure as string) || '',
        logo_structure: (row.logo as string) || null
      };

    } catch (error) {
      console.error('❌ [ONLINE-SELLER] Erreur récupération produit:', error);
      if (error instanceof OnlineSellerException) throw error;
      throw new OnlineSellerException('Impossible de récupérer le produit', 500);
    }
  }

  /**
   * Vérifie la disponibilité du stock pour une quantité donnée
   */
  async checkStock(
    idStructure: number,
    idProduit: number,
    quantite: number
  ): Promise<{ disponible: boolean; stock_actuel: number }> {
    try {
      const { produit } = await this.getProduitPublic(idStructure, idProduit);

      return {
        disponible: produit.niveau_stock >= quantite,
        stock_actuel: produit.niveau_stock
      };
    } catch (error) {
      console.error('❌ [ONLINE-SELLER] Erreur vérification stock:', error);
      return { disponible: false, stock_actuel: 0 };
    }
  }

  /**
   * Crée une facture + enregistre le paiement en une opération
   * Appelée APRÈS confirmation du paiement wallet (COMPLETED)
   *
   * Étape 1 : create_facture_online() - Crée la facture impayée avec les détails
   * Étape 2 : add_acompte_facture1() - Enregistre le paiement + journal + reçu
   */
  async createFactureOnline(params: CreateFactureOnlineParams): Promise<CreateFactureOnlineResult> {
    try {
      console.log('💳 [ONLINE-SELLER] Création facture online:', params);

      // Validations
      if (!params.id_structure || !params.id_produit) {
        throw new OnlineSellerException('Paramètres de produit manquants', 400);
      }
      if (!params.montant || params.montant <= 0) {
        throw new OnlineSellerException('Montant invalide', 400);
      }
      if (!params.uuid || !params.transaction_id) {
        throw new OnlineSellerException('Informations de paiement manquantes', 400);
      }
      if (!params.prenom || params.prenom.length < 2) {
        throw new OnlineSellerException('Prénom invalide', 400);
      }
      if (!params.telephone || !/^(77|78|76|70|75)\d{7}$/.test(params.telephone)) {
        throw new OnlineSellerException('Numéro de téléphone invalide', 400);
      }

      // Échappement du prénom pour SQL
      const prenomSafe = params.prenom.replace(/'/g, "''");
      const prixUnitaire = params.montant / params.quantite;

      // Format articles_string : "id_produit-quantite-prix#"
      const articlesString = `${params.id_produit}-${params.quantite}-${prixUnitaire}#`;

      // Étape 1 : Créer la facture (impayée, le paiement sera géré par add_acompte_facture1)
      const createQuery = `
        SELECT * FROM create_facture_online(
          '${new Date().toISOString().split('T')[0]}',
          ${params.id_structure},
          '${params.telephone}',
          '${prenomSafe}',
          ${params.montant},
          'Achat en ligne - ${prenomSafe}',
          '${articlesString}'
        )
      `;
      console.log('📤 [ONLINE-SELLER] Requête création facture:', createQuery);

      const factureResult = await DatabaseService.query(createQuery);

      if (!factureResult || factureResult.length === 0) {
        throw new OnlineSellerException('Aucune réponse de create_facture_complete1', 500);
      }

      console.log('🔍 [ONLINE-SELLER] Raw factureResult[0]:', JSON.stringify(factureResult[0]));
      const facture = this.parseResult(factureResult[0] as Record<string, unknown>);
      console.log('🔍 [ONLINE-SELLER] Parsed facture:', JSON.stringify(facture));

      // create_facture_online retourne: {id_facture, success, message, detail_ids, detail_count}
      const isSuccess = facture.success === true || facture.id_facture;
      const idFacture = facture.id_facture;

      if (!isSuccess || !idFacture) {
        throw new OnlineSellerException(
          facture.message || 'Erreur lors de la création de la facture',
          500
        );
      }

      console.log('✅ [ONLINE-SELLER] Facture créée:', {
        id_facture: idFacture,
        detail_count: facture.detail_count
      });

      // Étape 2 : Enregistrer le paiement + créer le reçu en une seule requête
      const modePaiement = params.mode_paiement;
      const acompteQuery = `
        SELECT * FROM add_acompte_facture1(
          ${params.id_structure},
          ${idFacture},
          ${params.montant},
          '${params.transaction_id}',
          '${params.uuid}',
          '${modePaiement}',
          '${params.telephone}'
        )
      `;
      console.log('📤 [ONLINE-SELLER] Requête acompte1:', acompteQuery);

      const acompteResult = await DatabaseService.query(acompteQuery);
      let acompteData = null;

      if (acompteResult && acompteResult.length > 0) {
        acompteData = this.parseResult(acompteResult[0] as Record<string, unknown>);
        console.log('✅ [ONLINE-SELLER] Paiement + reçu enregistrés:', acompteData);
      }

      // num_facture vient de add_acompte_facture1 → facture.num_facture
      const numFacture = acompteData?.facture?.num_facture || `FAC-${idFacture}`;

      return {
        success: true,
        id_facture: idFacture,
        num_facture: numFacture,
        acompte: acompteData
      };

    } catch (error) {
      console.error('❌ [ONLINE-SELLER] Erreur création facture online:', error);
      if (error instanceof OnlineSellerException) throw error;
      throw new OnlineSellerException(
        'Impossible de créer la facture',
        500
      );
    }
  }

  /**
   * Crée une facture multi-articles + enregistre le paiement
   * Pour le panier public du catalogue
   */
  async createFactureOnlinePanier(params: CreateFactureOnlinePanierParams): Promise<CreateFactureOnlineResult> {
    try {
      console.log('🛒 [ONLINE-SELLER] Création facture panier:', params);

      if (!params.id_structure || !params.articles.length) {
        throw new OnlineSellerException('Paramètres manquants', 400);
      }
      if (!params.montant_total || params.montant_total <= 0) {
        throw new OnlineSellerException('Montant invalide', 400);
      }
      if (!params.uuid || !params.transaction_id) {
        throw new OnlineSellerException('Informations de paiement manquantes', 400);
      }
      if (!params.telephone || !/^(77|78|76|70|75)\d{7}$/.test(params.telephone)) {
        throw new OnlineSellerException('Numéro de téléphone invalide', 400);
      }

      const prenomSafe = params.prenom.replace(/'/g, "''");

      // Format articles_string : "id1-qty1-prix1#id2-qty2-prix2#"
      const articlesString = params.articles
        .map(a => `${a.id_produit}-${a.quantite}-${a.prix_vente}`)
        .join('#') + '#';

      // Étape 1 : Créer la facture (impayée, le paiement sera géré par add_acompte_facture1)
      const createQuery = `
        SELECT * FROM create_facture_online(
          '${new Date().toISOString().split('T')[0]}',
          ${params.id_structure},
          '${params.telephone}',
          '${prenomSafe}',
          ${params.montant_total},
          'Achat en ligne - ${prenomSafe}',
          '${articlesString}'
        )
      `;
      console.log('📤 [ONLINE-SELLER] Requête création facture panier:', createQuery);

      const factureResult = await DatabaseService.query(createQuery);

      if (!factureResult || factureResult.length === 0) {
        throw new OnlineSellerException('Aucune réponse de create_facture_online', 500);
      }

      const facture = this.parseResult(factureResult[0] as Record<string, unknown>);

      if (!facture.success) {
        throw new OnlineSellerException(
          facture.message || 'Erreur lors de la création de la facture',
          500
        );
      }

      console.log('✅ [ONLINE-SELLER] Facture panier créée:', {
        id_facture: facture.id_facture,
        detail_count: facture.detail_count
      });

      // Étape 2 : Enregistrer le paiement + créer le reçu en une seule requête
      const modePaiement = params.mode_paiement;
      const acompteQuery = `
        SELECT * FROM add_acompte_facture1(
          ${params.id_structure},
          ${facture.id_facture},
          ${params.montant_total},
          '${params.transaction_id}',
          '${params.uuid}',
          '${modePaiement}',
          '${params.telephone}'
        )
      `;
      console.log('📤 [ONLINE-SELLER] Requête acompte1 panier:', acompteQuery);

      const acompteResult = await DatabaseService.query(acompteQuery);
      let acompteData = null;

      if (acompteResult && acompteResult.length > 0) {
        acompteData = this.parseResult(acompteResult[0] as Record<string, unknown>);
        console.log('✅ [ONLINE-SELLER] Paiement + reçu panier enregistrés:', acompteData);
      }

      const numFacture = acompteData?.facture?.num_facture || `FAC-${facture.id_facture}`;

      return {
        success: true,
        id_facture: facture.id_facture,
        num_facture: numFacture,
        acompte: acompteData
      };

    } catch (error) {
      console.error('❌ [ONLINE-SELLER] Erreur création facture panier:', error);
      if (error instanceof OnlineSellerException) throw error;
      throw new OnlineSellerException('Impossible de créer la facture', 500);
    }
  }

  /**
   * Parse le résultat d'une fonction PostgreSQL
   * Gère les cas où le résultat est un string JSON ou un objet
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseResult(row: Record<string, unknown>): any {
    const keys = Object.keys(row);
    // Si l'objet a plusieurs clés, c'est déjà le résultat plat (ex: {id_facture, success, message, ...})
    if (keys.length > 1) {
      return row;
    }
    // Sinon c'est wrappé dans une clé de fonction (ex: {create_facture_complete1: "{...}"})
    const data = row[keys[0]];
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  }
}

export const onlineSellerService = OnlineSellerService.getInstance();
export default onlineSellerService;
