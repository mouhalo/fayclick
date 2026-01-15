/**
 * Service Dashboard Partenaire FayClick
 * Gère les appels aux fonctions PostgreSQL pour le dashboard partenaire
 * Partenaires: id_structure = 0, id_groupe = 4, email @partner.fay
 *
 * Fonctions PostgreSQL:
 * - get_partenaire_by_user(id_utilisateur)
 * - get_partenaire_stats(id_partenaire)
 * - get_partenaire_structures(id_partenaire, limit, offset, search, type, statut)
 * - get_partenaire_detail_structure(id_partenaire, id_structure)
 */

import databaseService from './database.service';
import SecurityService from './security.service';
import {
  PartenaireByUserResponse,
  PartenaireStatsResponse,
  PartenaireListStructuresResponse,
  PartenaireListStructuresParams,
  PartenaireDetailStructureResponse,
  PartenaireStatsVentesResponse,
  PartenaireStatsVentesParams,
} from '@/types/partenaire.types';

class PartenaireService {
  private static instance: PartenaireService;

  static getInstance(): PartenaireService {
    if (!this.instance) {
      this.instance = new PartenaireService();
    }
    return this.instance;
  }

  /**
   * Récupère les informations du partenaire à partir de l'ID utilisateur
   * Utilisé lors de la connexion pour identifier le partenaire
   * Fonction PostgreSQL: get_partenaire_by_user(id_utilisateur)
   */
  async getPartenaireByUser(idUtilisateur: number): Promise<PartenaireByUserResponse> {
    try {
      SecurityService.secureLog('log', '🤝 [PARTENAIRE] Récupération infos partenaire', { idUtilisateur });

      const query = `SELECT * FROM get_partenaire_by_user(${idUtilisateur})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        return {
          success: false,
          message: 'Aucune donnée retournée'
        };
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_partenaire_by_user;
      const data: PartenaireByUserResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      if (data.success && data.partenaire) {
        SecurityService.secureLog('log', '✅ [PARTENAIRE] Partenaire identifié', {
          id: data.partenaire.id_partenaire,
          code: data.partenaire.code_promo,
          nom: data.partenaire.nom_partenaire
        });
      }

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [PARTENAIRE] Erreur récupération infos partenaire', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère les statistiques du partenaire pour les StatCards
   * Fonction PostgreSQL: get_partenaire_stats(id_partenaire)
   */
  async getStats(idPartenaire: number): Promise<PartenaireStatsResponse> {
    try {
      SecurityService.secureLog('log', '📊 [PARTENAIRE] Récupération statistiques', { idPartenaire });

      const query = `SELECT * FROM get_partenaire_stats(${idPartenaire})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        return {
          success: false,
          message: 'Aucune donnée retournée'
        };
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_partenaire_stats;
      const data: PartenaireStatsResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      if (data.success) {
        SecurityService.secureLog('log', '✅ [PARTENAIRE] Stats récupérées', {
          structures: data.structures?.total,
          ca_total: data.finances?.chiffre_affaires_total
        });
      }

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [PARTENAIRE] Erreur récupération statistiques', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère la liste des structures du partenaire (filtrées par code_promo)
   * Fonction PostgreSQL: get_partenaire_structures(id_partenaire, limit, offset, search, type, statut)
   */
  async getStructures(
    idPartenaire: number,
    params: PartenaireListStructuresParams = {}
  ): Promise<PartenaireListStructuresResponse> {
    try {
      const { limit = 20, offset = 0, search, type_structure, statut_abonnement } = params;

      SecurityService.secureLog('log', '📋 [PARTENAIRE] Liste structures', { idPartenaire, ...params });

      // Construire les paramètres
      const searchParam = search ? `'${search.replace(/'/g, "''")}'` : 'NULL';
      const typeParam = type_structure ? `'${type_structure}'` : 'NULL';
      const statutParam = statut_abonnement ? `'${statut_abonnement}'` : 'NULL';

      const query = `SELECT * FROM get_partenaire_structures(${idPartenaire}, ${limit}, ${offset}, ${searchParam}, ${typeParam}, ${statutParam})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        return {
          success: false,
          message: 'Aucune donnée retournée'
        };
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_partenaire_structures;
      const data: PartenaireListStructuresResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      if (data.success) {
        SecurityService.secureLog('log', '✅ [PARTENAIRE] Structures récupérées', {
          count: data.structures?.length,
          total: data.total
        });
      }

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [PARTENAIRE] Erreur liste structures', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère le détail d'une structure du partenaire
   * Vérifie que la structure appartient bien au partenaire
   * Fonction PostgreSQL: get_partenaire_detail_structure(id_partenaire, id_structure)
   */
  async getDetailStructure(
    idPartenaire: number,
    idStructure: number
  ): Promise<PartenaireDetailStructureResponse> {
    try {
      SecurityService.secureLog('log', '🔍 [PARTENAIRE] Détail structure', { idPartenaire, idStructure });

      const query = `SELECT * FROM get_partenaire_detail_structure(${idPartenaire}, ${idStructure})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        return {
          success: false,
          message: 'Aucune donnée retournée'
        };
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_partenaire_detail_structure;
      const data: PartenaireDetailStructureResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      if (data.success) {
        SecurityService.secureLog('log', '✅ [PARTENAIRE] Détail structure récupéré', {
          nom: data.data?.structure?.nom_structure
        });
      } else {
        SecurityService.secureLog('warn', '⚠️ [PARTENAIRE] Accès structure refusé', {
          idPartenaire,
          idStructure,
          message: data.message
        });
      }

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [PARTENAIRE] Erreur détail structure', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère les statistiques de ventes des structures du partenaire
   * Fonction PostgreSQL: get_partenaire_stats_ventes(id_partenaire, annee, mois, limit_top)
   */
  async getStatsVentes(
    idPartenaire: number,
    params: PartenaireStatsVentesParams = {}
  ): Promise<PartenaireStatsVentesResponse> {
    try {
      const { annee = new Date().getFullYear(), mois = null, limit_top = 10 } = params;

      SecurityService.secureLog('log', '📈 [PARTENAIRE] Stats ventes', { idPartenaire, annee, mois });

      // Construire les paramètres
      const moisParam = mois !== null ? mois : 'NULL';

      const query = `SELECT * FROM get_partenaire_stats_ventes(${idPartenaire}, ${annee}, ${moisParam}, ${limit_top})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        return {
          success: false,
          message: 'Aucune donnée retournée',
          periode: { annee, mois, label: '', date_debut: '', date_fin: '' },
          resume_global: {
            nombre_produits_distincts: 0,
            nombre_ventes: 0,
            quantite_totale_vendue: 0,
            chiffre_affaire_total: 0,
            cout_total: 0,
            marge_totale: 0,
            taux_marge_moyen: 0,
            prix_moyen_vente: 0,
            panier_moyen: 0,
            nombre_factures: 0,
            nombre_structures_actives: 0
          },
          par_categorie: [],
          par_structure: [],
          top_produits: [],
          evolution: []
        };
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_partenaire_stats_ventes;
      const data: PartenaireStatsVentesResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      if (data.success) {
        SecurityService.secureLog('log', '✅ [PARTENAIRE] Stats ventes récupérées', {
          ca_total: data.resume_global?.chiffre_affaire_total,
          structures_actives: data.resume_global?.nombre_structures_actives
        });
      }

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [PARTENAIRE] Erreur stats ventes', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        periode: { annee: new Date().getFullYear(), mois: null, label: '', date_debut: '', date_fin: '' },
        resume_global: {
          nombre_produits_distincts: 0,
          nombre_ventes: 0,
          quantite_totale_vendue: 0,
          chiffre_affaire_total: 0,
          cout_total: 0,
          marge_totale: 0,
          taux_marge_moyen: 0,
          prix_moyen_vente: 0,
          panier_moyen: 0,
          nombre_factures: 0,
          nombre_structures_actives: 0
        },
        par_categorie: [],
        par_structure: [],
        top_produits: [],
        evolution: []
      };
    }
  }
}

// Export singleton
const partenaireService = PartenaireService.getInstance();
export default partenaireService;
