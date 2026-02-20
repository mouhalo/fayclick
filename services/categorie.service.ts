/**
 * Service pour la gestion des catégories de produits/services
 * Utilise DatabaseService avec requêtes SQL directes
 * Appelle les fonctions PostgreSQL : get_list_categorie, add_edit_categorie, delete_categorie
 */

import databaseService from './database.service';
import type { CategoriesApiResponse, AddEditCategorieResponse, DeleteCategorieResponse } from '@/types/produit';

class CategorieService {
  private static instance: CategorieService;

  private constructor() {}

  static getInstance(): CategorieService {
    if (!this.instance) {
      this.instance = new CategorieService();
    }
    return this.instance;
  }

  /**
   * Récupère la liste des catégories d'une structure
   */
  async getListeCategories(idStructure: number): Promise<CategoriesApiResponse> {
    try {
      console.log('📂 [CategorieService] Récupération catégories:', { idStructure });

      if (!idStructure || idStructure <= 0) {
        throw new Error('ID structure invalide');
      }

      const requeteSql = `SELECT * FROM get_list_categorie(${idStructure})`;
      const result = await databaseService.envoyerRequeteApi('fayclick', requeteSql);

      if (!result || result.length === 0) {
        return { success: true, categories: [] };
      }

      const data = this.extractResponse<CategoriesApiResponse>(result[0], 'get_list_categorie');

      console.log('✅ [CategorieService] Catégories récupérées:', data);
      return data;
    } catch (error) {
      console.error('❌ [CategorieService] Erreur getListeCategories:', error);
      return { success: false, categories: [], error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  /**
   * Ajoute une nouvelle catégorie
   */
  async ajouterCategorie(idStructure: number, nom: string): Promise<AddEditCategorieResponse> {
    try {
      console.log('➕ [CategorieService] Ajout catégorie:', { idStructure, nom });

      if (!nom.trim() || nom.trim().length > 25) {
        return { success: false, error: 'Le nom doit contenir entre 1 et 25 caractères' };
      }

      const nomEscaped = nom.trim().replace(/'/g, "''");
      const requeteSql = `SELECT * FROM add_edit_categorie(${idStructure}, '${nomEscaped}')`;
      const result = await databaseService.envoyerRequeteApi('fayclick', requeteSql);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      const data = this.extractResponse<AddEditCategorieResponse>(result[0], 'add_edit_categorie');

      console.log('✅ [CategorieService] Catégorie ajoutée:', data);
      return data;
    } catch (error) {
      console.error('❌ [CategorieService] Erreur ajouterCategorie:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  /**
   * Modifie une catégorie existante (renommage)
   */
  async modifierCategorie(idStructure: number, ancienNom: string, nouveauNom: string): Promise<AddEditCategorieResponse> {
    try {
      console.log('✏️ [CategorieService] Modification catégorie:', { idStructure, ancienNom, nouveauNom });

      if (!nouveauNom.trim() || nouveauNom.trim().length > 25) {
        return { success: false, error: 'Le nom doit contenir entre 1 et 25 caractères' };
      }

      const ancienEscaped = ancienNom.trim().replace(/'/g, "''");
      const nouveauEscaped = nouveauNom.trim().replace(/'/g, "''");
      const requeteSql = `SELECT * FROM add_edit_categorie(${idStructure}, '${ancienEscaped}', '${nouveauEscaped}')`;
      const result = await databaseService.envoyerRequeteApi('fayclick', requeteSql);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      const data = this.extractResponse<AddEditCategorieResponse>(result[0], 'add_edit_categorie');

      console.log('✅ [CategorieService] Catégorie modifiée:', data);
      return data;
    } catch (error) {
      console.error('❌ [CategorieService] Erreur modifierCategorie:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  /**
   * Supprime une catégorie
   */
  async supprimerCategorie(idStructure: number, nom: string): Promise<DeleteCategorieResponse> {
    try {
      console.log('🗑️ [CategorieService] Suppression catégorie:', { idStructure, nom });

      const nomEscaped = nom.trim().replace(/'/g, "''");
      const requeteSql = `SELECT * FROM delete_categorie(${idStructure}, '${nomEscaped}')`;
      const result = await databaseService.envoyerRequeteApi('fayclick', requeteSql);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      const data = this.extractResponse<DeleteCategorieResponse>(result[0], 'delete_categorie');

      console.log('✅ [CategorieService] Catégorie supprimée:', data);
      return data;
    } catch (error) {
      console.error('❌ [CategorieService] Erreur supprimerCategorie:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  /**
   * Extrait et parse la réponse PostgreSQL
   */
  private extractResponse<T>(rawData: unknown, functionName: string): T {
    if (!rawData || typeof rawData !== 'object') {
      throw new Error('Format de données invalide');
    }

    const dataObj = rawData as Record<string, unknown>;

    // Chercher la clé correspondant au nom de la fonction
    let responseData: unknown;

    if (functionName in dataObj) {
      responseData = dataObj[functionName];
    } else {
      // Essayer la première clé disponible
      const keys = Object.keys(dataObj);
      responseData = keys.length > 0 ? dataObj[keys[0]] : rawData;
    }

    // Vérifier typeof avant JSON.parse()
    if (typeof responseData === 'string') {
      responseData = JSON.parse(responseData);
    }

    return responseData as T;
  }
}

export default CategorieService.getInstance();
