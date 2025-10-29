/**
 * Service pour la gestion des dépenses
 * Utilise DatabaseService avec requêtes SQL directes
 * Appelle les fonctions PostgreSQL du module dépenses
 */

import databaseService from './database.service';
import type { DepensesData, DepenseFormData } from '@/types/depense.types';

class DepenseService {
  private static instance: DepenseService;

  private constructor() {
    // databaseService est déjà un singleton importé directement
  }

  static getInstance(): DepenseService {
    if (!this.instance) {
      this.instance = new DepenseService();
    }
    return this.instance;
  }

  /**
   * Récupère la liste des dépenses pour une période donnée
   * @param structureId - ID de la structure
   * @param annee - Année à analyser
   * @param periode - Type de période ('mois', 'trimestre', 'annee')
   * @returns Données complètes des dépenses
   */
  async getListeDepenses(
    structureId: number,
    annee: number,
    periode: string = 'annee'
  ): Promise<DepensesData> {
    try {
      console.log('📊 [DepenseService] Récupération liste dépenses:', {
        structureId,
        annee,
        periode
      });

      // Validation des paramètres
      if (!structureId || structureId <= 0) {
        throw new Error('ID structure invalide');
      }

      if (!annee || annee < 2020 || annee > 2100) {
        throw new Error('Année invalide');
      }

      if (!['mois', 'trimestre', 'annee'].includes(periode)) {
        throw new Error('Période invalide (attendu: mois, trimestre, annee)');
      }

      // Construction de la requête SQL
      const requeteSql = `SELECT * FROM get_list_depenses(${structureId}, ${annee}, '${periode}')`;

      console.log('📝 [DepenseService] Requête SQL:', requeteSql);

      // Envoi de la requête via DatabaseService
      const result = await databaseService.envoyerRequeteApi('fayclick', requeteSql);

      console.log('✅ [DepenseService] Résultat brut reçu:', result);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée par get_list_depenses');
      }

      // Extraire les données du résultat
      const data = this.extractDepensesData(result[0]);

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la récupération des dépenses');
      }

      return data;
    } catch (error) {
      console.error('❌ [DepenseService] Erreur getListeDepenses:', error);
      throw error;
    }
  }

  /**
   * Ajoute une nouvelle dépense
   */
  async ajouterDepense(
    structureId: number,
    formData: DepenseFormData
  ): Promise<any> {
    try {
      console.log('➕ [DepenseService] Ajout dépense:', formData);

      // Échapper les apostrophes dans la description
      const descriptionEscaped = formData.description.replace(/'/g, "''");

      const requeteSql = `
        SELECT * FROM add_edit_depense(
          ${structureId},
          '${formData.date_depense}'::date,
          ${formData.id_type_depense},
          ${formData.montant},
          '${descriptionEscaped}',
          0
        )
      `;

      const result = await databaseService.envoyerRequeteApi('fayclick', requeteSql);

      if (!result || result.length === 0) {
        throw new Error('Échec de l\'ajout de la dépense');
      }

      console.log('✅ [DepenseService] Dépense ajoutée:', result[0]);
      return result[0];
    } catch (error) {
      console.error('❌ [DepenseService] Erreur ajouterDepense:', error);
      throw error;
    }
  }

  /**
   * Modifie une dépense existante
   */
  async modifierDepense(
    structureId: number,
    depenseId: number,
    formData: DepenseFormData
  ): Promise<any> {
    try {
      console.log('✏️ [DepenseService] Modification dépense:', { depenseId, formData });

      const descriptionEscaped = formData.description.replace(/'/g, "''");

      const requeteSql = `
        SELECT * FROM add_edit_depense(
          ${structureId},
          '${formData.date_depense}'::date,
          ${formData.id_type_depense},
          ${formData.montant},
          '${descriptionEscaped}',
          ${depenseId}
        )
      `;

      const result = await databaseService.envoyerRequeteApi('fayclick', requeteSql);

      if (!result || result.length === 0) {
        throw new Error('Échec de la modification de la dépense');
      }

      console.log('✅ [DepenseService] Dépense modifiée:', result[0]);
      return result[0];
    } catch (error) {
      console.error('❌ [DepenseService] Erreur modifierDepense:', error);
      throw error;
    }
  }

  /**
   * Supprime une dépense
   */
  async supprimerDepense(
    structureId: number,
    depenseId: number
  ): Promise<any> {
    try {
      console.log('🗑️ [DepenseService] Suppression dépense:', depenseId);

      const requeteSql = `SELECT * FROM delete_depense(${structureId}, ${depenseId})`;

      const result = await databaseService.envoyerRequeteApi('fayclick', requeteSql);

      if (!result || result.length === 0) {
        throw new Error('Échec de la suppression');
      }

      const data = this.extractDepensesData(result[0]);

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      console.log('✅ [DepenseService] Dépense supprimée');
      return data;
    } catch (error) {
      console.error('❌ [DepenseService] Erreur supprimerDepense:', error);
      throw error;
    }
  }

  /**
   * Ajoute ou modifie un type de dépense
   */
  async ajouterOuModifierType(
    structureId: number,
    nomType: string,
    typeId: number = 0
  ): Promise<any> {
    try {
      console.log('🏷️ [DepenseService] Ajout/Modification type:', { nomType, typeId });

      const nomTypeEscaped = nomType.replace(/'/g, "''");

      const requeteSql = `
        SELECT * FROM add_edit_type_depense(
          ${structureId},
          '${nomTypeEscaped}',
          ${typeId}
        )
      `;

      const result = await databaseService.envoyerRequeteApi('fayclick', requeteSql);

      if (!result || result.length === 0) {
        throw new Error('Échec de l\'opération sur le type');
      }

      console.log('✅ [DepenseService] Type traité:', result[0]);
      return result[0];
    } catch (error) {
      console.error('❌ [DepenseService] Erreur ajouterOuModifierType:', error);
      throw error;
    }
  }

  /**
   * Supprime un type de dépense
   */
  async supprimerType(
    structureId: number,
    typeId: number
  ): Promise<any> {
    try {
      console.log('🗑️ [DepenseService] Suppression type:', typeId);

      const requeteSql = `SELECT * FROM delete_type_depense(${structureId}, ${typeId})`;

      const result = await databaseService.envoyerRequeteApi('fayclick', requeteSql);

      if (!result || result.length === 0) {
        throw new Error('Échec de la suppression du type');
      }

      const data = this.extractDepensesData(result[0]);

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la suppression du type');
      }

      console.log('✅ [DepenseService] Type supprimé');
      return data;
    } catch (error) {
      console.error('❌ [DepenseService] Erreur supprimerType:', error);
      throw error;
    }
  }

  /**
   * Extrait les données depuis le résultat PostgreSQL
   */
  private extractDepensesData(rawData: unknown): DepensesData {
    try {
      console.log('🔍 [extractDepensesData] Extraction données:', typeof rawData);

      // Si rawData est une chaîne JSON, la parser
      let data: unknown;
      if (typeof rawData === 'string') {
        data = JSON.parse(rawData);
      } else {
        data = rawData;
      }

      // Vérifier si data est un objet
      if (!data || typeof data !== 'object') {
        throw new Error('Format de données invalide');
      }

      const dataObj = data as Record<string, unknown>;

      // Chercher la clé contenant les données
      let depensesData: unknown;

      if ('get_list_depenses' in dataObj) {
        depensesData = dataObj.get_list_depenses;
        if (typeof depensesData === 'string') {
          depensesData = JSON.parse(depensesData);
        }
      } else if ('delete_depense' in dataObj) {
        depensesData = dataObj.delete_depense;
        if (typeof depensesData === 'string') {
          depensesData = JSON.parse(depensesData);
        }
      } else if ('delete_type_depense' in dataObj) {
        depensesData = dataObj.delete_type_depense;
        if (typeof depensesData === 'string') {
          depensesData = JSON.parse(depensesData);
        }
      } else {
        depensesData = data;
      }

      // Cast final
      const finalData = depensesData as DepensesData;

      return finalData;
    } catch (error) {
      console.error('❌ [extractDepensesData] Erreur extraction:', error);
      throw new Error(`Erreur parsing données: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
}

export default DepenseService.getInstance();
