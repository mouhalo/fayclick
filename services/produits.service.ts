/**
 * Service de gestion des produits/services
 * Centralise toutes les opérations API pour les produits et services
 */

import { authService } from './auth.service';
import database from './database.service';
import SecurityService from './security.service';
import {
  Produit,
  ProduitFormData,
  ProduitFormDataNew,
  MouvementStockForm,
  AddEditProduitResponse,
  HistoriqueMouvements,
  ProduitsApiResponse,
  ProduitApiResponse,
  FiltreProduits,
  MouvementStock,
  StatsStructureProduits
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
   * Créer un nouveau produit
   */
  async createProduit(produitData: ProduitFormData): Promise<ProduitApiResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      // Validation des données
      if (!produitData.nom_produit?.trim()) {
        throw new ProduitsApiException('Le nom du produit est requis', 400);
      }

      if (produitData.prix_vente < 0 || produitData.cout_revient < 0) {
        throw new ProduitsApiException('Les prix ne peuvent pas être négatifs', 400);
      }

      // Construction de la requête INSERT
      const query = `
        INSERT INTO produit_service (
          nom_produit, 
          cout_revient, 
          prix_vente, 
          id_structure,
          description,
          code_produit,
          nom_categorie
        ) VALUES (
          '${produitData.nom_produit.replace(/'/g, "''")}',
          ${produitData.cout_revient},
          ${produitData.prix_vente},
          ${user.id_structure},
          ${produitData.description ? `'${produitData.description.replace(/'/g, "''")}'` : 'NULL'},
          ${produitData.code_produit ? `'${produitData.code_produit}'` : 'NULL'},
          ${produitData.nom_categorie ? `'${produitData.nom_categorie}'` : 'NULL'}
        ) RETURNING id_produit
      `;

      const results = await database.query(query);
      const nouveauProduit = Array.isArray(results) && results.length > 0 ? results[0] : null;

      SecurityService.secureLog('log', 'Produit créé avec succès', {
        id_produit: nouveauProduit.id_produit,
        nom: produitData.nom_produit
      });

      // Récupérer le produit créé avec toutes ses données calculées
      const produitCree = await this.getProduitById(nouveauProduit.id_produit);
      
      return {
        success: true,
        data: produitCree.data
      };

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
   * Mettre à jour un produit existant
   */
  async updateProduit(id_produit: number, produitData: Partial<ProduitFormData>): Promise<ProduitApiResponse> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      // Vérifier que le produit existe et appartient à la structure
      const produitExistant = await this.getProduitById(id_produit);
      if (!produitExistant.success) {
        throw new ProduitsApiException(`Produit ${id_produit} non trouvé`, 404);
      }

      // Construction de la requête UPDATE
      const setClause: string[] = [];
      
      if (produitData.nom_produit !== undefined) {
        setClause.push(`nom_produit = '${produitData.nom_produit.replace(/'/g, "''")}'`);
      }
      if (produitData.cout_revient !== undefined) {
        setClause.push(`cout_revient = ${produitData.cout_revient}`);
      }
      if (produitData.prix_vente !== undefined) {
        setClause.push(`prix_vente = ${produitData.prix_vente}`);
      }
      if (produitData.description !== undefined) {
        setClause.push(`description = ${produitData.description ? `'${produitData.description.replace(/'/g, "''")}'` : 'NULL'}`);
      }
      if (produitData.code_produit !== undefined) {
        setClause.push(`code_produit = ${produitData.code_produit ? `'${produitData.code_produit}'` : 'NULL'}`);
      }
      if (produitData.nom_categorie !== undefined) {
        setClause.push(`nom_categorie = ${produitData.nom_categorie ? `'${produitData.nom_categorie}'` : 'NULL'}`);
      }

      if (setClause.length === 0) {
        throw new ProduitsApiException('Aucune donnée à mettre à jour', 400);
      }

      const query = `
        UPDATE produit_service 
        SET ${setClause.join(', ')}
        WHERE id_produit = ${id_produit} AND id_structure = ${user.id_structure}
      `;

      await database.query(query);

      SecurityService.secureLog('log', 'Produit mis à jour', {
        id_produit,
        modifications: Object.keys(produitData)
      });

      // Récupérer le produit mis à jour
      const produitMisAJour = await this.getProduitById(id_produit);

      return {
        success: true,
        data: produitMisAJour.data
      };

    } catch (error) {
      SecurityService.secureLog('error', 'Erreur mise à jour produit', { id_produit, error });
      
      if (error instanceof ProduitsApiException) {
        throw error;
      }
      
      throw new ProduitsApiException(
        'Impossible de mettre à jour le produit',
        500,
        error
      );
    }
  }

  /**
   * Supprimer un produit
   */
  async deleteProduit(id_produit: number): Promise<{ success: boolean; message: string }> {
    try {
      const user = authService.getUser();
      if (!user) {
        throw new ProduitsApiException('Utilisateur non authentifié', 401);
      }

      // Vérifier que le produit existe et appartient à la structure
      const produitExistant = await this.getProduitById(id_produit);
      if (!produitExistant.success) {
        throw new ProduitsApiException(`Produit ${id_produit} non trouvé`, 404);
      }

      // Supprimer d'abord les mouvements de stock associés
      const deleteStockQuery = `DELETE FROM mouvement_stock WHERE id_produit = ${id_produit} AND id_structure = ${user.id_structure}`;
      await database.executeFunction('delete_mouvement_stock', [id_produit.toString(), user.id_structure.toString()]);

      // Supprimer le produit
      const deleteProduitQuery = `DELETE FROM produit_service WHERE id_produit = ${id_produit} AND id_structure = ${user.id_structure}`;
      await database.executeFunction('delete_produit', [id_produit.toString(), user.id_structure.toString()]);

      SecurityService.secureLog('log', 'Produit supprimé', { id_produit });

      return {
        success: true,
        message: 'Produit supprimé avec succès'
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
   * Ajouter un mouvement de stock
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

      // Insérer le mouvement de stock
      const query = `
        INSERT INTO mouvement_stock (
          id_produit,
          id_structure, 
          type_mouvement,
          quantite,
          description,
          created_by,
          tms_create
        ) VALUES (
          ${mouvement.id_produit},
          ${user.id_structure},
          '${mouvement.type_mouvement}',
          ${mouvement.quantite},
          ${mouvement.description ? `'${mouvement.description.replace(/'/g, "''")}'` : 'NULL'},
          ${user.id},
          NOW()
        ) RETURNING *
      `;

      const results = await database.query(query);
      const nouveauMouvement = Array.isArray(results) && results.length > 0 ? results[0] : null;

      SecurityService.secureLog('log', 'Mouvement stock ajouté', {
        id_produit: mouvement.id_produit,
        type: mouvement.type_mouvement,
        quantite: mouvement.quantite
      });

      return {
        success: true,
        data: nouveauMouvement
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
          ${produitData.est_service},
          ${produitData.nom_categorie ? `'${produitData.nom_categorie.replace(/'/g, "''")}'` : 'DEFAULT'},
          ${produitData.description ? `'${produitData.description.replace(/'/g, "''")}'` : 'DEFAULT'},
          0
        )
      `;

      const results = await database.query(query);
      const produit = Array.isArray(results) && results.length > 0 ? results[0] : null;

      if (!produit) {
        throw new ProduitsApiException('Erreur lors de la création du produit', 500);
      }

      SecurityService.secureLog('log', 'Produit créé avec succès', {
        id_produit: produit.id_produit,
        nom: produitData.nom_produit,
        est_service: produitData.est_service
      });

      return produit as AddEditProduitResponse;

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
          ${produitData.est_service},
          ${produitData.nom_categorie ? `'${produitData.nom_categorie.replace(/'/g, "''")}'` : 'DEFAULT'},
          ${produitData.description ? `'${produitData.description.replace(/'/g, "''")}'` : 'DEFAULT'},
          ${id_produit}
        )
      `;

      const results = await database.query(query);
      const produit = Array.isArray(results) && results.length > 0 ? results[0] : null;

      if (!produit) {
        throw new ProduitsApiException('Erreur lors de la modification du produit', 500);
      }

      SecurityService.secureLog('log', 'Produit modifié avec succès', {
        id_produit: produit.id_produit,
        nom: produitData.nom_produit,
        action: produit.action_effectuee
      });

      return produit as AddEditProduitResponse;

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
}

// Export de l'instance unique
export const produitsService = ProduitsService.getInstance();