/**
 * Service pour récupérer le catalogue global de tous les produits publics
 * Sans authentification - Affichage de tous les produits de toutes les structures
 */

import { CataloguesGlobalResponse } from '@/types/catalogues';

export class CataloguesPublicException extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'CataloguesPublicException';
  }
}

class CataloguesPublicService {
  private static instance: CataloguesPublicService;
  private cache: CataloguesGlobalResponse | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): CataloguesPublicService {
    if (!this.instance) {
      this.instance = new CataloguesPublicService();
    }
    return this.instance;
  }

  /**
   * Récupère tous les produits publics de toutes les structures
   * Utilise la fonction PostgreSQL get_all_produits_publics()
   * Cache de 5 minutes pour optimiser les performances
   */
  async getAllProduitsPublics(): Promise<CataloguesGlobalResponse> {
    try {
      // Vérifier le cache
      const now = Date.now();
      if (this.cache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
        console.log('✅ [CATALOGUES GLOBAL] Données récupérées depuis le cache');
        return this.cache;
      }

      console.log('🔍 [CATALOGUES GLOBAL] Appel fonction PostgreSQL get_all_produits_publics()');

      // Import dynamique du service database
      const database = (await import('./database.service')).default;

      // Appel de la fonction PostgreSQL qui retourne tout le JSON
      // Timeout élevé car 118K+ produits = payload JSON volumineux
      const query = `SELECT * FROM get_all_produits_publics()`;
      const data = await database.query(query, 120000);

      console.log('📦 [CATALOGUES GLOBAL] Données brutes reçues:', JSON.stringify(data, null, 2).substring(0, 500));

      // Vérifier si la requête a retourné des données
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new CataloguesPublicException('Aucun produit public disponible', 404);
      }

      // Parser les données retournées (la fonction retourne un JSON dans la première ligne)
      let catalogueData;

      if (Array.isArray(data) && data.length > 0) {
        // Si c'est un tableau, prendre le premier élément
        const firstRow = data[0];
        // La colonne peut s'appeler 'get_all_produits_publics' ou être directement l'objet
        catalogueData = firstRow.get_all_produits_publics || firstRow;
      } else {
        catalogueData = data;
      }

      // Si les données sont encore emballées dans une chaîne JSON, les parser
      if (typeof catalogueData === 'string') {
        try {
          catalogueData = JSON.parse(catalogueData);
        } catch (e) {
          console.error('❌ [CATALOGUES GLOBAL] Erreur parsing JSON:', e);
          throw new CataloguesPublicException('Format de données invalide', 500);
        }
      }

      // Validation de la structure de réponse
      if (!catalogueData || typeof catalogueData !== 'object') {
        console.error('❌ [CATALOGUES GLOBAL] Structure de données invalide:', catalogueData);
        throw new CataloguesPublicException('Format de données invalide', 500);
      }

      // Vérifier si la requête a réussi
      if (catalogueData.success === false) {
        throw new CataloguesPublicException(
          catalogueData.message || 'Erreur lors de la récupération du catalogue global',
          404
        );
      }

      // Transformer la structure groupée par structures en liste plate de produits
      const produitsFlat: any[] = [];

      if (catalogueData.structures && Array.isArray(catalogueData.structures)) {
        catalogueData.structures.forEach((structure: any) => {
          if (structure.produits && Array.isArray(structure.produits)) {
            structure.produits.forEach((produit: any) => {
              produitsFlat.push({
                ...produit,
                // Ajouter les infos de la structure à chaque produit
                id_structure: structure.id_structure,
                nom_structure: structure.nom_structure,
                logo_structure: structure.logo || structure.logo_structure,
                type_structure: structure.type_structure,
                telephone_structure: structure.telephone || structure.phone || structure.tel,
                adresse_structure: structure.adresse || ''
              });
            });
          }
        });
      }

      // Construire la réponse dans le format attendu
      const normalizedData: CataloguesGlobalResponse = {
        success: catalogueData.success,
        message: catalogueData.message,
        total_produits: catalogueData.statistiques?.total_produits || produitsFlat.length,
        total_structures: catalogueData.statistiques?.total_structures || catalogueData.structures?.length || 0,
        data: produitsFlat
      };

      console.log('✅ [CATALOGUES GLOBAL] Catalogue récupéré:', {
        total_produits: normalizedData.total_produits,
        total_structures: normalizedData.total_structures,
        data_length: normalizedData.data.length
      });

      // Mettre en cache les résultats normalisés
      this.cache = normalizedData;
      this.cacheTimestamp = now;

      return this.cache;

    } catch (error) {
      console.error('❌ [CATALOGUES GLOBAL] Erreur:', error);

      if (error instanceof CataloguesPublicException) {
        throw error;
      }

      throw new CataloguesPublicException(
        'Impossible de récupérer le catalogue global',
        500
      );
    }
  }

  /**
   * Invalide le cache manuellement (utile après ajout/modification de produits)
   */
  invalidateCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
    console.log('🗑️ [CATALOGUES GLOBAL] Cache invalidé');
  }

  /**
   * Récupère les statistiques du catalogue sans charger tous les produits
   */
  async getStats(): Promise<{
    total_produits: number;
    total_structures: number;
  }> {
    try {
      const catalogue = await this.getAllProduitsPublics();
      return {
        total_produits: catalogue.total_produits,
        total_structures: catalogue.total_structures
      };
    } catch (error) {
      if (error instanceof CataloguesPublicException && error.statusCode === 404) {
        return {
          total_produits: 0,
          total_structures: 0
        };
      }
      throw error;
    }
  }
}

export const cataloguesPublicService = CataloguesPublicService.getInstance();
export default cataloguesPublicService;
