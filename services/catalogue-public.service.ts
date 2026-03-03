/**
 * Service pour récupérer le catalogue public de produits (sans authentification)
 * Inspiré de recu.service.ts avec requêtes SQL directes
 */

export class CataloguePublicException extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'CataloguePublicException';
  }
}

class CataloguePublicService {
  private static instance: CataloguePublicService;

  static getInstance(): CataloguePublicService {
    if (!this.instance) {
      this.instance = new CataloguePublicService();
    }
    return this.instance;
  }

  /**
   * Récupère les produits publics d'une structure par son nom
   * Utilise la fonction PostgreSQL get_produits_by_structure_name
   * @param nomStructure Nom de la structure (ex: 'SYLVIACOM')
   */
  async getProduitsPublics(nomStructure: string): Promise<unknown> {
    try {
      // Validation du paramètre
      if (!nomStructure || nomStructure.trim() === '') {
        throw new CataloguePublicException('Nom de structure manquant', 400);
      }

      // Validation format : alphanumeric + underscore + espaces + tirets
      if (!/^[A-Z0-9_ \-'.&()]+$/i.test(nomStructure)) {
        throw new CataloguePublicException('Nom de structure invalide', 400);
      }

      console.log('🔍 [CATALOGUE PUBLIC] Appel fonction PostgreSQL pour:', nomStructure);

      // Import dynamique du service database
      const database = (await import('./database.service')).default;

      // Appel de la fonction PostgreSQL qui retourne tout le JSON
      const query = `SELECT * FROM get_produits_by_structure_name('${nomStructure.replace(/'/g, "''")}')`;
      const data = await database.query(query);

      console.log('📦 [CATALOGUE PUBLIC] Données brutes reçues:', JSON.stringify(data, null, 2).substring(0, 500));

      // Vérifier si la requête a retourné des données
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new CataloguePublicException('Structure introuvable ou aucun produit disponible', 404);
      }

      // Parser les données retournées (la fonction retourne un JSON dans la première ligne)
      let catalogueData;

      if (Array.isArray(data) && data.length > 0) {
        // Si c'est un tableau, prendre le premier élément
        const firstRow = data[0];
        // La colonne peut s'appeler 'get_produits_by_structure_name' ou être directement l'objet
        catalogueData = firstRow.get_produits_by_structure_name || firstRow;
      } else {
        catalogueData = data;
      }

      // Si les données sont encore emballées dans une chaîne JSON, les parser
      if (typeof catalogueData === 'string') {
        try {
          catalogueData = JSON.parse(catalogueData);
        } catch (e) {
          console.error('❌ [CATALOGUE PUBLIC] Erreur parsing JSON:', e);
          throw new CataloguePublicException('Format de données invalide', 500);
        }
      }

      // Validation de la structure de réponse
      if (!catalogueData || typeof catalogueData !== 'object') {
        console.error('❌ [CATALOGUE PUBLIC] Structure de données invalide:', catalogueData);
        throw new CataloguePublicException('Format de données invalide', 500);
      }

      // Vérifier si la requête a réussi
      if (catalogueData.success === false) {
        throw new CataloguePublicException(
          catalogueData.message || 'Erreur lors de la récupération du catalogue',
          404
        );
      }

      console.log('✅ [CATALOGUE PUBLIC] Catalogue récupéré:', {
        nom_structure: catalogueData.nom_structure,
        total_produits: catalogueData.total_produits,
        data_length: catalogueData.data?.length
      });

      return catalogueData;

    } catch (error) {
      console.error('❌ [CATALOGUE PUBLIC] Erreur:', error);

      if (error instanceof CataloguePublicException) {
        throw error;
      }

      throw new CataloguePublicException(
        'Impossible de récupérer le catalogue',
        500
      );
    }
  }

  /**
   * Récupère les produits publics d'une structure par son ID
   * Appelle directement la fonction PostgreSQL avec le nom résolu (sans re-valider la regex)
   */
  async getProduitsPublicsById(idStructure: number): Promise<unknown> {
    try {
      if (!idStructure || isNaN(idStructure)) {
        throw new CataloguePublicException('ID de structure invalide', 400);
      }

      const database = (await import('./database.service')).default;

      // Résoudre le nom_structure depuis l'ID
      const result = await database.query(
        `SELECT nom_structure FROM structures WHERE id_structure = ${idStructure}`
      );

      if (!result || result.length === 0) {
        throw new CataloguePublicException('Structure introuvable', 404);
      }

      const nomStructure = (result[0] as Record<string, unknown>).nom_structure as string;
      if (!nomStructure) {
        throw new CataloguePublicException('Structure introuvable', 404);
      }

      console.log('🔍 [CATALOGUE PUBLIC] Appel fonction PostgreSQL pour:', nomStructure, '(id:', idStructure, ')');

      // Appel direct de la fonction PostgreSQL (sans passer par getProduitsPublics qui valide la regex)
      const query = `SELECT * FROM get_produits_by_structure_name('${nomStructure.replace(/'/g, "''")}')`;
      const data = await database.query(query);

      console.log('📦 [CATALOGUE PUBLIC] Données brutes reçues:', JSON.stringify(data, null, 2).substring(0, 500));

      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new CataloguePublicException('Structure introuvable ou aucun produit disponible', 404);
      }

      let catalogueData;
      if (Array.isArray(data) && data.length > 0) {
        const firstRow = data[0];
        catalogueData = firstRow.get_produits_by_structure_name || firstRow;
      } else {
        catalogueData = data;
      }

      if (typeof catalogueData === 'string') {
        try {
          catalogueData = JSON.parse(catalogueData);
        } catch (e) {
          console.error('❌ [CATALOGUE PUBLIC] Erreur parsing JSON:', e);
          throw new CataloguePublicException('Format de données invalide', 500);
        }
      }

      if (!catalogueData || typeof catalogueData !== 'object') {
        throw new CataloguePublicException('Format de données invalide', 500);
      }

      if (catalogueData.success === false) {
        throw new CataloguePublicException(
          catalogueData.message || 'Erreur lors de la récupération du catalogue',
          404
        );
      }

      console.log('✅ [CATALOGUE PUBLIC] Catalogue récupéré:', {
        nom_structure: catalogueData.nom_structure,
        total_produits: catalogueData.total_produits,
        data_length: catalogueData.data?.length
      });

      return catalogueData;
    } catch (error) {
      console.error('❌ [CATALOGUE PUBLIC] Erreur:', error);
      if (error instanceof CataloguePublicException) throw error;
      throw new CataloguePublicException('Impossible de récupérer le catalogue', 500);
    }
  }

  /**
   * Vérifie si une structure existe et a des produits publics
   */
  async checkStructureHasProducts(nomStructure: string): Promise<{
    exists: boolean;
    totalProduits: number;
  }> {
    try {
      const catalogue = await this.getProduitsPublics(nomStructure);

      // Assertion de type pour accéder aux propriétés
      const typedCatalogue = catalogue as {
        success: boolean;
        total_produits: number;
      };

      return {
        exists: true,
        totalProduits: typedCatalogue.total_produits || 0
      };
    } catch (error) {
      if (error instanceof CataloguePublicException && error.statusCode === 404) {
        return {
          exists: false,
          totalProduits: 0
        };
      }
      throw error;
    }
  }
}

export const cataloguePublicService = CataloguePublicService.getInstance();
export default cataloguePublicService;