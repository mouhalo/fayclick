/**
 * Service pour la gestion des statistiques d'inventaire
 * Utilise DatabaseService avec requêtes SQL directes
 * Appelle la fonction PostgreSQL: get_inventaire(pid_structure, pannee, pperiode)
 */

import DatabaseService from './database.service';
import type { InventaireData, PeriodeType } from '@/types/inventaire.types';

class InventaireService {
  private static instance: InventaireService;
  private databaseService: DatabaseService;

  private constructor() {
    this.databaseService = DatabaseService;
  }

  static getInstance(): InventaireService {
    if (!this.instance) {
      this.instance = new InventaireService();
    }
    return this.instance;
  }

  /**
   * Récupère les statistiques d'inventaire pour une période donnée
   * @param structureId - ID de la structure
   * @param annee - Année à analyser
   * @param periode - Type de période (semaine, mois, annee)
   * @returns Données complètes des statistiques
   */
  async getStatistiques(
    structureId: number,
    annee: number,
    periode: PeriodeType
  ): Promise<InventaireData> {
    try {
      console.log('📊 [InventaireService] Récupération statistiques:', {
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

      if (!['semaine', 'mois', 'annee'].includes(periode)) {
        throw new Error('Période invalide (attendu: semaine, mois, annee)');
      }

      // Construction de la requête SQL
      const requeteSql = `SELECT * FROM get_inventaire(${structureId}, ${annee}, '${periode}')`;

      console.log('📝 [InventaireService] Requête SQL:', requeteSql);

      // Envoi de la requête via DatabaseService
      const result = await this.databaseService.envoyerRequeteApi(
        'payecole',
        requeteSql
      );

      console.log('✅ [InventaireService] Résultat brut reçu:', result);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée par la fonction get_inventaire');
      }

      // Extraire les données du résultat
      const data = this.extractInventaireData(result[0]);

      console.log('📦 [InventaireService] Données extraites:', {
        success: data.success,
        structure_id: data.structure_id,
        periode: data.periode,
        nbTopArticles: data.top_articles?.length || 0,
        nbTopClients: data.top_clients?.length || 0,
        nbEvolutionPoints: data.evolution_ventes?.length || 0
      });

      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue lors de la récupération des statistiques');
      }

      return data;
    } catch (error) {
      console.error('❌ [InventaireService] Erreur:', error);
      throw error;
    }
  }

  /**
   * Extrait les données d'inventaire depuis le résultat PostgreSQL
   * Gère différentes structures de réponse possibles
   */
  private extractInventaireData(rawData: unknown): InventaireData {
    try {
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

      // Cast vers un objet indexable
      const dataObj = data as Record<string, unknown>;

      // Chercher la clé contenant "get_inventaire"
      let inventaireData: unknown;

      if ('get_inventaire' in dataObj) {
        inventaireData = dataObj.get_inventaire;
        // Si c'est une chaîne, la parser
        if (typeof inventaireData === 'string') {
          inventaireData = JSON.parse(inventaireData);
        }
      } else {
        // Si pas de clé get_inventaire, utiliser data directement
        inventaireData = data;
      }

      // Validation du format final
      if (!inventaireData || typeof inventaireData !== 'object') {
        throw new Error('Structure de données invalide après extraction');
      }

      // Cast final vers InventaireData
      const finalData = inventaireData as InventaireData;

      // Vérification des propriétés essentielles
      if (!finalData.success) {
        console.warn('⚠️ [InventaireService] success=false dans les données:', finalData);
      }

      return finalData;
    } catch (error) {
      console.error('❌ [InventaireService] Erreur extraction données:', error);
      console.error('Données brutes problématiques:', rawData);
      throw new Error(`Erreur parsing données inventaire: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Formate un montant en FCFA avec séparateurs de milliers
   */
  formatMontant(montant: number): string {
    return `${montant.toLocaleString('fr-FR')} FCFA`;
  }

  /**
   * Formate une variation en pourcentage avec signe + ou -
   */
  formatVariation(variation: number): string {
    const signe = variation >= 0 ? '+' : '';
    return `${signe}${variation.toFixed(1)}%`;
  }

  /**
   * Détermine si une variation est positive, négative ou nulle
   */
  getVariationType(variation: number): 'positive' | 'negative' | 'neutral' {
    if (variation > 0) return 'positive';
    if (variation < 0) return 'negative';
    return 'neutral';
  }

  /**
   * Obtient le libellé de la période en français
   */
  getPeriodeLabel(periode: PeriodeType): string {
    const labels: Record<PeriodeType, string> = {
      semaine: 'Semaine',
      mois: 'Mois',
      annee: 'Année'
    };
    return labels[periode] || periode;
  }

  /**
   * Obtient la variation de comparaison selon la période
   */
  getVariationContext(periode: PeriodeType): string {
    const contexts: Record<PeriodeType, string> = {
      semaine: 'vs semaine dernière',
      mois: 'vs mois dernier',
      annee: 'vs année dernière'
    };
    return contexts[periode] || '';
  }
}

export default InventaireService.getInstance();
