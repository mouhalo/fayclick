/**
 * Service de gestion des produits/services
 * Centralise toutes les opérations API pour les produits et services
 */

import { authService } from './auth.service';
import database from './database.service';
import SecurityService from './security.service';
import {
  Produit,
  ProduitFormDataNew,
  MouvementStockForm,
  AddEditProduitResponse,
  HistoriqueMouvements,
  ProduitsApiResponse,
  ProduitApiResponse,
  FiltreProduits,
  MouvementStock,
  StatsStructureProduits,
  PhotoProduit,
  AddEditPhotoParams,
  AddEditPhotoResponse,
  ProduitCatalogue
} from '@/types/produit';

// Exception personnalisée pour les erreurs API produits
export class ProduitsApiException extends Error {
  constructor(public message: string, public status?: number, public details?: unknown) {
    super(message);
    this.name = 'ProduitsApiException';
  }
}

/**
 * Service singleton pour la gestion des produits
 */
export class ProduitsService {
  private static instance: ProduitsService;

  private constructor() {}  // DatabaseService est importé directement comme instance

  // Pattern Singleton
  public static getInstance(): ProduitsService {
    if (!ProduitsService.instance) {
      ProduitsService.instance = new ProduitsService();
    }
    return ProduitsService.instance;
  }


  /**
   * Récupérer la liste des produits avec filtres optionnels
   */
  async getListeProduits(filtres?: FiltreProduits): Promise<ProduitsApiResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      SecurityService.secureLog('log', 'Récupération liste produits', {
        id_structure: user.id_structure,
        filtres
      });

      // Construction de la requête SQL avec filtres
      let whereClause = `WHERE id_structure = ${user.id_structure}`;
      let orderClause = 'ORDER BY nom_produit ASC';

      if (filtres) {
        if (filtres.searchTerm) {
          const searchTerm = filtres.searchTerm.toLowerCase();
          whereClause += ` AND (LOWER(nom_produit) LIKE '%${searchTerm}%' OR LOWER(description) LIKE '%${searchTerm}%')`;
        }
        
        if (filtres.nom_categorie) {
          whereClause += ` AND nom_categorie = '${filtres.nom_categorie}'`;
        }
        
        if (filtres.enStock !== undefined) {
          if (filtres.enStock) {
            whereClause += ` AND niveau_stock > 0`;
          } else {
            whereClause += ` AND niveau_stock <= 0`;
          }
        }
        
        if (filtres.prixMin !== undefined) {
          whereClause += ` AND prix_vente >= ${filtres.prixMin}`;
        }
        
        if (filtres.prixMax !== undefined) {
          whereClause += ` AND prix_vente <= ${filtres.prixMax}`;
        }
        
        // Gestion du tri
        if (filtres.sortBy) {
          const direction = filtres.sortOrder === 'desc' ? 'DESC' : 'ASC';
          switch (filtres.sortBy) {
            case 'nom':
              orderClause = `ORDER BY nom_produit ${direction}`;
              break;
            case 'prix':
              orderClause = `ORDER BY prix_vente ${direction}`;
              break;
            case 'stock':
              orderClause = `ORDER BY niveau_stock ${direction}`;
              break;
            case 'marge':
              orderClause = `ORDER BY marge ${direction}`;
              break;
            default:
              orderClause = 'ORDER BY nom_produit ASC';
          }
        }
      }

      const query = `SELECT * FROM list_produits ${whereClause} ${orderClause}`;
      
      const results = await database.query(query);
      
      // database.query() retourne directement le tableau de données
      const produits = Array.isArray(results) ? results : [];
      
      SecurityService.secureLog('log', 'Produits extraits', {
        nombreProduits: produits.length,
        premierProduit: produits.length > 0 ? produits[0] : null
      });
      
      return {
        success: true,
        data: produits,
        total: produits.length
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération produits', error);
      
      if (error instanceof ProduitsApiException) {
        throw error;
      }
      
      throw new ProduitsApiException(
        'Impossible de récupérer la liste des produits',
        500,
        error
      );
    }
  }

  /**
   * Récupérer un produit par son ID
   */
  async getProduitById(id_produit: number): Promise<ProduitApiResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      const query = `SELECT * FROM list_produits WHERE id_produit = ${id_produit} AND id_structure = ${user.id_structure}`;
      const results = await database.query(query);
      const produits = Array.isArray(results) ? results : [];

      if (produits.length === 0) {
        throw new ProduitsApiException(`Produit ${id_produit} non trouvé`, 404);
      }
      
      return {
        success: true,
        data: produits[0]
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur récupération produit', { id_produit, error });
      
      if (error instanceof ProduitsApiException) {
        throw error;
      }
      
      throw new ProduitsApiException(
        `Impossible de récupérer le produit ${id_produit}`,
        500,
        error
      );
    }
  }

  /**
   * Supprimer un produit avec la fonction PostgreSQL supprimer_produit
   */
  async deleteProduit(id_produit: number): Promise<{ success: boolean; message: string }> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      console.log('🗑️ [PRODUITS SERVICE] Suppression produit:', {
        id_produit,
        id_structure: user.id_structure,
        id_utilisateur: user.id
      });

      // Utiliser la fonction PostgreSQL supprimer_produit
      const query = `SELECT * FROM supprimer_produit(${user.id_structure}, ${id_produit}, ${user.id})`;

      const results = await database.query(query);
      console.log('🗄️ [PRODUITS SERVICE] Réponse brute DB supprimer_produit:', JSON.stringify(results, null, 2));

      const result = Array.isArray(results) && results.length > 0 ? results[0] : null;

      if (!result) {
        throw new ProduitsApiException('Aucune réponse de la fonction de suppression', 500);
      }

      console.log('📦 [PRODUITS SERVICE] Résultat suppression:', result);

      // Gérer le format de réponse de la fonction
      let suppressionData = result;
      if (result.supprimer_produit) {
        console.log('🔄 [PRODUITS SERVICE] Résultat encapsulé détecté, extraction...');
        suppressionData = typeof result.supprimer_produit === 'string'
          ? JSON.parse(result.supprimer_produit)
          : result.supprimer_produit;
        console.log('✅ [PRODUITS SERVICE] Résultat après extraction:', suppressionData);
      }

      // Si les données sont encore dans une chaîne JSON
      if (typeof suppressionData === 'string') {
        try {
          suppressionData = JSON.parse(suppressionData);
          console.log('🔄 [PRODUITS SERVICE] JSON parsé:', suppressionData);
        } catch (e) {
          console.error('❌ [PRODUITS SERVICE] Erreur parsing JSON:', e);
        }
      }

      // Vérifier le succès de l'opération
      if (!suppressionData.success) {
        const errorMessage = suppressionData.message || 'Erreur lors de la suppression';
        SecurityService.secureLog('warn', 'Échec suppression produit', {
          id_produit,
          code: suppressionData.code,
          message: errorMessage
        });

        throw new ProduitsApiException(errorMessage, 400);
      }

      // Log des détails de suppression
      const details = suppressionData.details || {};
      SecurityService.secureLog('log', 'Produit supprimé avec succès', {
        id_produit,
        code: suppressionData.code,
        cascade_deletion: details.cascade_deletion,
        deleted_sales: details.deleted_sales,
        deleted_stock_movements: details.deleted_stock_movements
      });

      return {
        success: true,
        message: suppressionData.message || 'Produit supprimé avec succès'
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur suppression produit', { id_produit, error });

      if (error instanceof ProduitsApiException) {
        throw error;
      }

      throw new ProduitsApiException(
        'Impossible de supprimer le produit',
        500,
        error
      );
    }
  }

  /**
   * Ajouter un mouvement de stock via fonction PostgreSQL add_mouvement_stock
   */
  async addMouvementStock(mouvement: Omit<MouvementStock, 'id' | 'tms_create'>): Promise<{ success: boolean; data: MouvementStock }> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      // Validation des données
      if (!mouvement.id_produit || !mouvement.type_mouvement || !mouvement.quantite) {
        throw new ProduitsApiException('Données du mouvement incomplètes', 400);
      }

      if (mouvement.quantite <= 0) {
        throw new ProduitsApiException('La quantité doit être positive', 400);
      }

      // Vérifier que le produit existe
      const produitExistant = await this.getProduitById(mouvement.id_produit);
      if (!produitExistant.success) {
        throw new ProduitsApiException(`Produit ${mouvement.id_produit} non trouvé`, 404);
      }

      // Utiliser la fonction PostgreSQL add_mouvement_stock (INSERT direct bloqué par module sécurité)
      const query = `
        SELECT public.add_mouvement_stock(
          ${mouvement.id_produit},
          ${user.id_structure},
          '${mouvement.type_mouvement}',
          ${mouvement.quantite},
          ${mouvement.description ? `'${mouvement.description.replace(/'/g, "''")}'` : 'NULL'},
          ${user.id}
        )
      `;

      const results = await database.query(query);

      // Parser la réponse JSON de la fonction PostgreSQL
      let functionResponse = null;
      if (Array.isArray(results) && results.length > 0) {
        const rawResult = results[0];
        const jsonString = rawResult.add_mouvement_stock || Object.values(rawResult)[0];

        if (typeof jsonString === 'string') {
          try {
            functionResponse = JSON.parse(jsonString);
          } catch {
            console.log('⚠️ [PRODUITS-SERVICE] Réponse non-JSON:', jsonString);
          }
        } else if (typeof jsonString === 'object') {
          functionResponse = jsonString;
        }
      }

      if (!functionResponse?.success) {
        throw new ProduitsApiException(
          functionResponse?.message || 'Erreur lors de l\'ajout du mouvement',
          400
        );
      }

      SecurityService.secureLog('log', 'Mouvement stock ajouté', {
        id_produit: mouvement.id_produit,
        type: mouvement.type_mouvement,
        quantite: mouvement.quantite,
        id_mouvement: functionResponse.data?.id_mouvement
      });

      return {
        success: true,
        data: functionResponse.data
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur mouvement stock', error);
      
      if (error instanceof ProduitsApiException) {
        throw error;
      }
      
      throw new ProduitsApiException(
        'Impossible d\'ajouter le mouvement de stock',
        500,
        error
      );
    }
  }


  /**
   * Effectuer un inventaire (ajustement de stock)
   */
  async ajusterStock(id_produit: number, nouveau_stock: number, motif: string): Promise<{ success: boolean; message: string }> {
    try {
      const produit = await this.getProduitById(id_produit);
      const stock_actuel = produit.data.niveau_stock || 0;
      const difference = nouveau_stock - stock_actuel;

      if (difference === 0) {
        return {
          success: true,
          message: 'Aucun ajustement nécessaire'
        };
      }

      const mouvement: Omit<MouvementStock, 'id' | 'tms_create'> = {
        id_produit,
        id_structure: authService.getUser()!.id_structure,
        type_mouvement: 'AJUSTEMENT',
        quantite: Math.abs(difference),
        prix_unitaire: produit.data.cout_revient,
        description: `Ajustement inventaire: ${motif}`,
        date_mouvement: new Date()
      };

      await this.addMouvementStock(mouvement);

      return {
        success: true,
        message: 'Stock ajusté avec succès'
      };

    } catch (error) {
      throw new ProduitsApiException(
        'Impossible d\'ajuster le stock',
        500,
        error
      );
    }
  }

  /**
   * Recherche rapide de produits (pour l'autocomplete)
   */
  async searchProduits(terme: string): Promise<Produit[]> {
    try {
      const response = await this.getListeProduits({
        searchTerm: terme,
        sortBy: 'nom',
        sortOrder: 'asc'
      });

      return response.data.slice(0, 10); // Limiter à 10 résultats

    } catch (error) {
      console.error('Erreur recherche produits:', error);
      return [];
    }
  }

  /**
   * Vérifier la disponibilité du stock
   */
  verifierDisponibilite(produit: Produit, quantite: number): boolean {
    const stock = produit.niveau_stock || 0;
    return stock >= quantite;
  }

  /**
   * Calculer le total d'une liste de produits
   */
  calculerTotal(produits: { produit: Produit; quantite: number }[]): number {
    return produits.reduce((total, item) => {
      return total + (item.produit.prix_vente * item.quantite);
    }, 0);
  }

  // ===============================
  // NOUVELLES MÉTHODES API POUR LE MODAL À 3 ONGLETS
  // ===============================

  /**
   * Créer un nouveau produit/service avec la nouvelle API add_edit_produit
   */
  async createProduitNew(produitData: ProduitFormDataNew): Promise<AddEditProduitResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      const query = `
        SELECT * FROM add_edit_produit(
          ${user.id_structure},
          '${produitData.nom_produit.replace(/'/g, "''")}',
          ${produitData.cout_revient},
          ${produitData.prix_vente},
          ${produitData.est_service ? 'true' : 'false'},
          ${produitData.nom_categorie ? `'${produitData.nom_categorie.replace(/'/g, "''")}'` : `'produit_service'`},
          ${produitData.description ? `'${produitData.description.replace(/'/g, "''")}'` : `'RAS'`},
          ${produitData.presente_au_public !== undefined ? (produitData.presente_au_public ? 'true' : 'false') : 'NULL'},
          0,
          ${produitData.code_barres ? `'${produitData.code_barres.replace(/'/g, "''")}'` : `''`}
        )
      `;

      const results = await database.query(query);
      console.log('🗄️ [PRODUITS SERVICE] Réponse brute DB add_edit_produit:', JSON.stringify(results, null, 2));

      const produit = Array.isArray(results) && results.length > 0 ? results[0] : null;

      if (!produit) {
        throw new ProduitsApiException('Erreur lors de la création du produit', 500);
      }

      console.log('📦 [PRODUITS SERVICE] Produit extrait:', produit);

      // Si le produit est encapsulé dans une fonction (add_edit_produit)
      let produitResult = produit;
      if (produit.add_edit_produit) {
        console.log('🔄 [PRODUITS SERVICE] Produit encapsulé détecté, extraction...');
        produitResult = typeof produit.add_edit_produit === 'string'
          ? JSON.parse(produit.add_edit_produit)
          : produit.add_edit_produit;
        console.log('✅ [PRODUITS SERVICE] Produit après extraction:', produitResult);
      }

      // Gérer le format avec préfixe result_ de PostgreSQL
      if (produitResult.result_id_produit !== undefined) {
        console.log('🔄 [PRODUITS SERVICE] Format result_ détecté, transformation...');
        produitResult = {
          id_produit: produitResult.result_id_produit,
          id_structure: produitResult.result_id_structure,
          nom_produit: produitResult.result_nom_produit,
          cout_revient: produitResult.result_cout_revient,
          prix_vente: produitResult.result_prix_vente,
          est_service: produitResult.result_est_service,
          nom_categorie: produitResult.result_nom_categorie,
          description: produitResult.result_description,
          action_effectuee: produitResult.result_action_effectuee,
          code_barres: produitResult.result_code_barre || undefined
        };
        console.log('✅ [PRODUITS SERVICE] Produit transformé:', produitResult);
      }

      SecurityService.secureLog('log', 'Produit créé avec succès', {
        id_produit: produitResult.id_produit,
        nom: produitResult.nom_produit,
        est_service: produitResult.est_service
      });

      return produitResult as AddEditProduitResponse;

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur création produit', error);
      
      if (error instanceof ProduitsApiException) {
        throw error;
      }
      
      throw new ProduitsApiException(
        'Impossible de créer le produit',
        500,
        error
      );
    }
  }

  /**
   * Modifier un produit/service existant avec la nouvelle API add_edit_produit
   */
  async updateProduitNew(id_produit: number, produitData: ProduitFormDataNew): Promise<AddEditProduitResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      const query = `
        SELECT * FROM add_edit_produit(
          ${user.id_structure},
          '${produitData.nom_produit.replace(/'/g, "''")}',
          ${produitData.cout_revient},
          ${produitData.prix_vente},
          ${produitData.est_service ? 'true' : 'false'},
          ${produitData.nom_categorie ? `'${produitData.nom_categorie.replace(/'/g, "''")}'` : `'produit_service'`},
          ${produitData.description ? `'${produitData.description.replace(/'/g, "''")}'` : `'RAS'`},
          ${produitData.presente_au_public !== undefined ? (produitData.presente_au_public ? 'true' : 'false') : 'NULL'},
          ${id_produit},
          ${produitData.code_barres ? `'${produitData.code_barres.replace(/'/g, "''")}'` : `''`}
        )
      `;

      const results = await database.query(query);
      console.log('🗄️ [PRODUITS SERVICE] Réponse brute DB update_produit:', JSON.stringify(results, null, 2));

      const produit = Array.isArray(results) && results.length > 0 ? results[0] : null;

      if (!produit) {
        throw new ProduitsApiException('Erreur lors de la modification du produit', 500);
      }

      console.log('📦 [PRODUITS SERVICE] Produit extrait (update):', produit);

      // Si le produit est encapsulé dans une fonction (add_edit_produit)
      let produitDataResult = produit;
      if (produit.add_edit_produit) {
        console.log('🔄 [PRODUITS SERVICE] Produit encapsulé détecté (update), extraction...');
        produitDataResult = typeof produit.add_edit_produit === 'string'
          ? JSON.parse(produit.add_edit_produit)
          : produit.add_edit_produit;
        console.log('✅ [PRODUITS SERVICE] Produit après extraction (update):', produitDataResult);
      }

      // Gérer le format avec préfixe result_ de PostgreSQL
      if (produitDataResult.result_id_produit !== undefined) {
        console.log('🔄 [PRODUITS SERVICE] Format result_ détecté (update), transformation...');
        produitDataResult = {
          id_produit: produitDataResult.result_id_produit,
          id_structure: produitDataResult.result_id_structure,
          nom_produit: produitDataResult.result_nom_produit,
          cout_revient: produitDataResult.result_cout_revient,
          prix_vente: produitDataResult.result_prix_vente,
          est_service: produitDataResult.result_est_service,
          nom_categorie: produitDataResult.result_nom_categorie,
          description: produitDataResult.result_description,
          action_effectuee: produitDataResult.result_action_effectuee,
          code_barres: produitDataResult.result_code_barre || undefined
        };
        console.log('✅ [PRODUITS SERVICE] Produit transformé (update):', produitDataResult);
      }

      SecurityService.secureLog('log', 'Produit modifié avec succès', {
        id_produit: produitDataResult.id_produit,
        nom: produitDataResult.nom_produit,
        action: produitDataResult.action_effectuee
      });

      return produitDataResult as AddEditProduitResponse;

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur modification produit', { id_produit, error });
      
      if (error instanceof ProduitsApiException) {
        throw error;
      }
      
      throw new ProduitsApiException(
        'Impossible de modifier le produit',
        500,
        error
      );
    }
  }

  /**
   * Ajouter un mouvement de stock avec la fonction PostgreSQL gere_stock
   */
  async addMouvementStockLegacy(id_produit: number, mouvementData: MouvementStockForm): Promise<{ success: boolean; message: string; nouveau_stock: number }> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      // Vérifier que le produit existe et n'est pas un service
      const produitResponse = await this.getProduitById(id_produit);
      if (!produitResponse.success) {
        throw new ProduitsApiException('Produit non trouvé', 404);
      }

      // Utiliser la fonction PostgreSQL gere_stock pour insérer le mouvement
      const mouvementQuery = `
        SELECT gere_stock(
          ${user.id_structure},
          ${id_produit},
          '${mouvementData.type_mouvement}',
          ${mouvementData.quantite},
          ${mouvementData.prix_unitaire},
          ${mouvementData.description ? `'${mouvementData.description.replace(/'/g, "''")}'` : 'NULL'}
        ) as mouvement_id
      `;

      const mouvementResult = await database.query(mouvementQuery);
      const mouvementId = Array.isArray(mouvementResult) && mouvementResult.length > 0 ? mouvementResult[0]?.mouvement_id : null;

      if (!mouvementId) {
        throw new ProduitsApiException('Erreur lors de l\'enregistrement du mouvement', 500);
      }

      // Récupérer le stock actuel après le mouvement
      const stockQuery = `
        SELECT 
          COALESCE(SUM(CASE 
            WHEN type_mouvement = 'ENTREE' THEN quantite 
            WHEN type_mouvement = 'SORTIE' THEN -quantite 
          END), 0) as stock_actuel
        FROM mouvement_stock
        WHERE id_produit = ${id_produit}
        AND id_structure = ${user.id_structure}
      `;

      const stockResult = await database.query(stockQuery);
      const nouveauStock = Array.isArray(stockResult) && stockResult.length > 0 ? 
        (stockResult[0]?.stock_actuel || 0) : 0;

      SecurityService.secureLog('log', 'Mouvement de stock ajouté avec gere_stock', {
        id_produit,
        mouvement_id: mouvementId,
        type: mouvementData.type_mouvement,
        quantite: mouvementData.quantite,
        nouveau_stock: nouveauStock
      });

      return {
        success: true,
        message: `Stock de l'article mis à jour avec succès`,
        nouveau_stock: nouveauStock
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur mouvement stock avec gere_stock', { id_produit, error });
      
      if (error instanceof ProduitsApiException) {
        throw error;
      }
      
      throw new ProduitsApiException(
        'Impossible d\'enregistrer le mouvement de stock',
        500,
        error
      );
    }
  }

  /**
   * Récupérer l'historique des mouvements de stock pour un produit
   */
  async getHistoriqueMouvements(id_produit: number): Promise<HistoriqueMouvements> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      const query = `
        SELECT 
          ms.*,
          p.nom_produit,
          (ms.prix_unitaire * ms.quantite) as total
        FROM mouvement_stock ms
        JOIN produit_service p ON ms.id_produit = p.id_produit
        WHERE ms.id_produit = ${id_produit}
        AND ms.id_structure = ${user.id_structure}
        ORDER BY ms.tms_create DESC
      `;

      const results = await database.query(query);
      const mouvements = Array.isArray(results) ? results : [];

      // Calculer les totaux
      const totaux = mouvements.reduce((acc, mouvement) => {
        const montant = mouvement.quantite * mouvement.prix_unitaire;
        
        if (mouvement.type_mouvement === 'ENTREE') {
          acc.totalEntrees += mouvement.quantite;
          acc.totalEntriesMontant += montant;
        } else if (mouvement.type_mouvement === 'SORTIE') {
          acc.totalSorties += mouvement.quantite;
          acc.totalSortiesMontant += montant;
        }
        
        return acc;
      }, {
        totalEntrees: 0,
        totalSorties: 0,
        totalEntriesMontant: 0,
        totalSortiesMontant: 0
      });

      return {
        mouvements: mouvements as MouvementStock[],
        ...totaux
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur historique mouvements', { id_produit, error });
      
      if (error instanceof ProduitsApiException) {
        throw error;
      }
      
      throw new ProduitsApiException(
        'Impossible de récupérer l\'historique des mouvements',
        500,
        error
      );
    }
  }

  /**
   * Ajouter ou modifier une photo de produit
   * Utilise la fonction SQL add_edit_photo()
   */
  async addEditPhoto(params: AddEditPhotoParams): Promise<AddEditPhotoResponse> {
    console.log('📸 [PRODUITS SERVICE] addEditPhoto appelé:', params);

    try {
      const user = authService.getUser();
      if (!user) {
        console.error('❌ [PRODUITS SERVICE] Utilisateur non authentifié');
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      console.log('✅ [PRODUITS SERVICE] Utilisateur authentifié:', {
        id_utilisateur: user.id_utilisateur,
        id_structure: user.id_structure
      });

      SecurityService.secureLog('log', 'Add/Edit photo produit', {
        id_produit: params.id_produit,
        id_photo: params.id_photo,
        operation: params.id_photo ? 'UPDATE' : 'INSERT'
      });

      // Construction de la requête SQL
      const sqlParams = [
        `p_id_structure := ${params.id_structure}`,
        `p_id_produit := ${params.id_produit}`,
        `p_url_photo := '${params.url_photo.replace(/'/g, "''")}'`
      ];

      if (params.id_photo) {
        sqlParams.push(`p_id_photo := ${params.id_photo}`);
      }

      const query = `SELECT add_edit_photo(${sqlParams.join(', ')})`;
      console.log('📝 [PRODUITS SERVICE] Requête SQL:', query);

      const results = await database.query(query);
      console.log('📦 [PRODUITS SERVICE] Résultats bruts DB:', results);

      if (!results || results.length === 0) {
        console.error('❌ [PRODUITS SERVICE] Aucune réponse de la base de données');
        throw new ProduitsApiException('Aucune réponse de la base de données');
      }

      // Parser la réponse JSON
      const response = results[0].add_edit_photo;
      console.log('🔍 [PRODUITS SERVICE] Réponse add_edit_photo:', response);

      const parsedResponse: AddEditPhotoResponse = typeof response === 'string'
        ? JSON.parse(response)
        : response;

      console.log('✅ [PRODUITS SERVICE] Réponse parsée:', parsedResponse);

      SecurityService.secureLog('log', 'Photo produit sauvegardée', {
        success: parsedResponse.success,
        id_photo: parsedResponse.data.id_photo
      });

      return parsedResponse;

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur add_edit_photo', { error });

      if (error instanceof ProduitsApiException) {
        throw error;
      }

      throw new ProduitsApiException(
        'Impossible de sauvegarder la photo',
        500,
        error
      );
    }
  }

  /**
   * Récupérer toutes les photos d'un produit via get_mes_produits
   */
  async getPhotos(id_produit: number): Promise<PhotoProduit[]> {
    console.log('📸 [PRODUITS SERVICE] getPhotos appelé:', { id_produit });

    try {
      const user = authService.getUser();
      if (!user) {
        console.error('❌ [PRODUITS SERVICE] Utilisateur non authentifié');
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      console.log('✅ [PRODUITS SERVICE] Utilisateur authentifié:', {
        id_utilisateur: user.id_utilisateur,
        id_structure: user.id_structure
      });

      SecurityService.secureLog('log', 'Récupération photos produit', { id_produit });

      // Utiliser la fonction get_mes_produits qui retourne les photos
      const query = `SELECT * FROM get_mes_produits(${user.id_structure}, ${id_produit})`;
      console.log('📝 [PRODUITS SERVICE] Requête SQL getPhotos:', query);

      const results = await database.query(query);
      console.log('📦 [PRODUITS SERVICE] Résultats bruts DB:', results);

      if (!results || results.length === 0) {
        console.warn('⚠️ [PRODUITS SERVICE] Aucun résultat de la DB');
        return [];
      }

      // Parser la réponse JSON
      const response = results[0].get_mes_produits;
      console.log('🔍 [PRODUITS SERVICE] Réponse get_mes_produits:', response);

      const parsedResponse = typeof response === 'string'
        ? JSON.parse(response)
        : response;

      console.log('✅ [PRODUITS SERVICE] Réponse parsée:', parsedResponse);

      // Vérifier le succès et extraire les photos
      if (!parsedResponse.success || !parsedResponse.data || parsedResponse.data.length === 0) {
        console.warn('⚠️ [PRODUITS SERVICE] Pas de produit trouvé ou pas de données');
        return [];
      }

      const produit = parsedResponse.data[0];
      console.log('📦 [PRODUITS SERVICE] Produit extrait:', produit);
      console.log('📸 [PRODUITS SERVICE] Photos brutes du produit:', produit.photos);

      const photos: PhotoProduit[] = (produit.photos || []).map((photo: any) => ({
        id_photo: photo.id_photo,
        id_produit: id_produit,
        id_structure: user.id_structure,
        url_photo: photo.url_photo,
        created_at: photo.date_upload,
        updated_at: photo.date_maj
      }));

      console.log('✅ [PRODUITS SERVICE] Photos mappées:', photos);

      SecurityService.secureLog('log', 'Photos récupérées', {
        id_produit,
        nombre_photos: photos.length
      });

      return photos;

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur getPhotos', { error });
      throw new ProduitsApiException(
        'Impossible de récupérer les photos',
        500,
        error
      );
    }
  }

  /**
   * Supprimer une photo de produit
   */
  async deletePhoto(id_photo: number): Promise<boolean> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      // Utiliser la fonction PostgreSQL del_produit_photo (DELETE direct bloqué par module sécurité)
      const query = `
        SELECT public.del_produit_photo(
          ${id_photo},
          ${user.id_structure}
        )
      `;

      const results = await database.query(query);

      // Parser la réponse JSON de la fonction PostgreSQL
      let functionResponse = null;
      if (Array.isArray(results) && results.length > 0) {
        const rawResult = results[0];
        const jsonString = rawResult.del_produit_photo || Object.values(rawResult)[0];

        if (typeof jsonString === 'string') {
          try {
            functionResponse = JSON.parse(jsonString);
          } catch {
            console.log('⚠️ [PRODUITS-SERVICE] Réponse non-JSON:', jsonString);
          }
        } else if (typeof jsonString === 'object') {
          functionResponse = jsonString;
        }
      }

      if (!functionResponse?.success) {
        throw new ProduitsApiException(
          functionResponse?.message || 'Erreur lors de la suppression de la photo',
          400
        );
      }

      SecurityService.secureLog('log', 'Photo supprimée', { id_photo });
      return true;

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur deletePhoto', { error });
      throw new ProduitsApiException(
        'Impossible de supprimer la photo',
        500,
        error
      );
    }
  }

  /**
   * Mettre à jour le statut de présentation publique d'un produit
   */
  async updatePresentationPublique(
    id_produit: number,
    presente_au_public: boolean
  ): Promise<boolean> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      const query = `
        UPDATE produits
        SET presente_au_public = ${presente_au_public}
        WHERE id_produit = ${id_produit}
          AND id_structure = ${user.id_structure}
      `;

      await database.query(query);

      SecurityService.secureLog('log', 'Présentation publique mise à jour', {
        id_produit,
        presente_au_public
      });

      return true;

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur updatePresentationPublique', { error });
      throw new ProduitsApiException(
        'Impossible de mettre à jour la présentation publique',
        500,
        error
      );
    }
  }

  /**
   * Récupérer les produits du catalogue public d'une structure
   * Accessible sans authentification
   */
  async getCataloguePublic(nom_structure: string): Promise<ProduitCatalogue[]> {
    try {
      SecurityService.secureLog('log', 'Récupération catalogue public', { nom_structure });

      // Récupérer les produits publics avec infos structure
      const query = `
        SELECT
          p.*,
          s.nom_structure,
          s.adresse,
          s.mobile_om,
          s.mobile_wave
        FROM vw_produits p
        INNER JOIN list_structures s ON p.id_structure = s.id_structure
        WHERE s.nom_structure = '${nom_structure.replace(/'/g, "''")}'
          AND p.presente_au_public = true
        ORDER BY p.nom_produit ASC
      `;

      const produits = await database.query(query);

      // Pour chaque produit, récupérer ses photos
      const cataloguePromises = produits.map(async (produit: any) => {
        const queryPhotos = `
          SELECT
            id_photo,
            id_produit,
            id_structure,
            url_photo,
            ordre,
            created_at
          FROM produit_photos
          WHERE id_produit = ${produit.id_produit}
          ORDER BY ordre ASC, created_at ASC
          LIMIT 6
        `;

        const photos = await database.query(queryPhotos);

        return {
          ...produit,
          photos: photos as PhotoProduit[]
        } as ProduitCatalogue;
      });

      const catalogue = await Promise.all(cataloguePromises);

      SecurityService.secureLog('log', 'Catalogue public récupéré', {
        nombre_produits: catalogue.length
      });

      return catalogue;

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur getCataloguePublic', { error });
      throw new ProduitsApiException(
        'Impossible de récupérer le catalogue public',
        500,
        error
      );
    }
  }
}

// Export de l'instance unique
export const produitsService = ProduitsService.getInstance();