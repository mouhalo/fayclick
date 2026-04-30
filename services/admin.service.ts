/**
 * Service d'administration FayClick
 * Gère les appels aux fonctions PostgreSQL pour le dashboard admin
 * Utilisateur: Admin System (id = -1)
 */

import databaseService from './database.service';
import SecurityService from './security.service';
import {
  AdminStatsGlobal,
  AdminStatsGlobalResponse,
  AdminListStructuresResponse,
  AdminListStructuresParams,
  AdminListAbonnementsResponse,
  AdminListAbonnementsParams,
  AdminStatsVentesResponse,
  AdminStatsVentesParams,
  AdminDetailStructureResponse,
  AdminStatsProduitsResponse,
  AdminStatsProduitsParams,
  AdminProduitsVendusDetailsResponse,
  AdminProduitsVendusDetailsParams,
  AdminAllUtilisateursResponse,
  AdminAllUtilisateursParams,
  AdminDetailUtilisateurResponse,
  AdminReferenceDataResponse,
  // Types Partenaires & Codes Promo
  AdminListPartenairesResponse,
  AdminListPartenairesParams,
  AddEditPartenaireParams,
  AddEditPartenaireResponse,
  TogglePartenaireResponse,
  ProlongerPartenaireResponse,
  AdminStatsCodesPromoResponse,
  AdminStatsCodesPromoParams,
  ValidateCodePromoResponse,
  // Type détail structure
  GetUneStructureResponse,
  // Types admin gestion structures (PRD admin-gestion-structures)
  EditStructureParams,
  EditStructureResponse,
  EditParamStructureAdminParams,
  DeleteStructureParams,
  DeleteStructureResponse,
  OffrirAbonnementParams,
  OffrirAbonnementResponse,
  AjusterMensualiteParams,
  AjusterMensualiteResponse,
  ResetUserPasswordParams,
  ResetUserPasswordResponse,
  AdminActionType,
  AdminActionCibleType
} from '@/types/admin.types';

class AdminService {
  private static instance: AdminService;

  static getInstance(): AdminService {
    if (!this.instance) {
      this.instance = new AdminService();
    }
    return this.instance;
  }

  /**
   * Récupère les statistiques globales pour les 4 StatCards
   * Fonction PostgreSQL: get_admin_stats_global()
   */
  async getStatsGlobal(): Promise<AdminStatsGlobalResponse> {
    try {
      SecurityService.secureLog('log', '📊 [ADMIN] Récupération stats globales');

      const query = 'SELECT * FROM get_admin_stats_global()';
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_admin_stats_global;
      const data: AdminStatsGlobalResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Stats globales récupérées', {
        structures: data.data?.structures?.total,
        produits: data.data?.produits?.total,
        abonnements_actifs: data.data?.abonnements?.actifs
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération stats globales', error);
      throw error;
    }
  }

  /**
   * Liste les structures avec pagination et filtres
   * Fonction PostgreSQL: get_admin_list_structures(limit, offset, search, type, statut)
   */
  async getListStructures(params: AdminListStructuresParams = {}): Promise<AdminListStructuresResponse> {
    try {
      const { limit = 20, offset = 0, search, type_structure, statut_abonnement } = params;

      SecurityService.secureLog('log', '📋 [ADMIN] Récupération liste structures', params);

      // Construire les paramètres (NULL pour les valeurs non définies)
      const searchParam = search ? `'${search.replace(/'/g, "''")}'` : 'NULL';
      const typeParam = type_structure ? `'${type_structure}'` : 'NULL';
      const statutParam = statut_abonnement ? `'${statut_abonnement}'` : 'NULL';

      const query = `SELECT * FROM get_admin_list_structures(${limit}, ${offset}, ${searchParam}, ${typeParam}, ${statutParam})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_admin_list_structures;
      const data: AdminListStructuresResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Liste structures récupérée', {
        count: data.data?.structures?.length,
        total: data.data?.pagination?.total
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération liste structures', error);
      throw error;
    }
  }

  /**
   * Liste les abonnements avec pagination et filtres
   * Fonction PostgreSQL: get_admin_list_abonnements(limit, offset, statut, type, date_debut, date_fin)
   */
  async getListAbonnements(params: AdminListAbonnementsParams = {}): Promise<AdminListAbonnementsResponse> {
    try {
      const { limit = 20, offset = 0, statut, type, date_debut, date_fin } = params;

      SecurityService.secureLog('log', '📋 [ADMIN] Récupération liste abonnements', params);

      // Construire les paramètres
      const statutParam = statut ? `'${statut}'` : 'NULL';
      const typeParam = type ? `'${type}'` : 'NULL';
      const dateDebutParam = date_debut ? `'${date_debut}'::DATE` : 'NULL';
      const dateFinParam = date_fin ? `'${date_fin}'::DATE` : 'NULL';

      const query = `SELECT * FROM get_admin_list_abonnements(${limit}, ${offset}, ${statutParam}, ${typeParam}, ${dateDebutParam}, ${dateFinParam})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_admin_list_abonnements;
      const data: AdminListAbonnementsResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Liste abonnements récupérée', {
        count: data.data?.abonnements?.length,
        total: data.data?.pagination?.total
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération liste abonnements', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques de ventes
   * Fonction PostgreSQL: get_admin_stats_ventes(annee, mois, id_structure)
   */
  async getStatsVentes(params: AdminStatsVentesParams = {}): Promise<AdminStatsVentesResponse> {
    try {
      const { annee, mois, id_structure } = params;

      SecurityService.secureLog('log', '📈 [ADMIN] Récupération stats ventes', params);

      // Construire les paramètres
      const anneeParam = annee ?? `EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER`;
      const moisParam = mois ?? 'NULL';
      const structureParam = id_structure ?? 'NULL';

      const query = `SELECT * FROM get_admin_stats_ventes(${anneeParam}, ${moisParam}, ${structureParam})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_admin_stats_ventes;
      const data: AdminStatsVentesResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Stats ventes récupérées', {
        periode: data.data?.periode?.label,
        factures: data.data?.resume_global?.nombre_factures
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération stats ventes', error);
      throw error;
    }
  }

  /**
   * Récupère les détails d'une structure spécifique
   * Fonction PostgreSQL: get_admin_detail_structure(id_structure)
   */
  async getDetailStructure(idStructure: number): Promise<AdminDetailStructureResponse> {
    try {
      SecurityService.secureLog('log', '🔍 [ADMIN] Récupération détail structure', { idStructure });

      const query = `SELECT * FROM get_admin_detail_structure(${idStructure})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Structure non trouvée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_admin_detail_structure;
      const data: AdminDetailStructureResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Détail structure récupéré', {
        nom: data.data?.structure?.nom_structure
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération détail structure', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques globales des produits vendus
   * Fonction PostgreSQL: get_admin_stats_produits_vendus(annee, mois, id_structure, categorie, limit_top)
   */
  async getStatsProduits(params: AdminStatsProduitsParams = {}): Promise<AdminStatsProduitsResponse> {
    try {
      const {
        annee = new Date().getFullYear(),
        mois,
        id_structure,
        categorie,
        limit_top = 20
      } = params;

      SecurityService.secureLog('log', '📊 [ADMIN] Récupération stats produits vendus', params);

      // Construire les paramètres
      const moisParam = mois !== undefined ? mois : 'NULL';
      const structureParam = id_structure !== undefined ? id_structure : 'NULL';
      const categorieParam = categorie ? `'${categorie.replace(/'/g, "''")}'` : 'NULL';

      const query = `SELECT * FROM get_admin_stats_produits_vendus(${annee}, ${moisParam}, ${structureParam}, ${categorieParam}, ${limit_top})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_admin_stats_produits_vendus;
      const data: AdminStatsProduitsResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Stats produits récupérées', {
        periode: data.data?.periode?.label,
        ca_total: data.data?.resume_global?.chiffre_affaire_total,
        top_produits: data.data?.top_produits?.length
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération stats produits', error);
      throw error;
    }
  }

  /**
   * Récupère la liste détaillée paginée des produits vendus
   * Fonction PostgreSQL: get_admin_produits_vendus_details(limit, offset, annee, mois, id_structure, categorie, search, order_by, order_dir)
   */
  async getProduitsVendusDetails(params: AdminProduitsVendusDetailsParams = {}): Promise<AdminProduitsVendusDetailsResponse> {
    try {
      const {
        limit = 50,
        offset = 0,
        annee = new Date().getFullYear(),
        mois,
        id_structure,
        categorie,
        search,
        order_by = 'quantite',
        order_dir = 'DESC'
      } = params;

      SecurityService.secureLog('log', '📋 [ADMIN] Récupération liste produits vendus', params);

      // Construire les paramètres
      const moisParam = mois !== undefined ? mois : 'NULL';
      const structureParam = id_structure !== undefined ? id_structure : 'NULL';
      const categorieParam = categorie ? `'${categorie.replace(/'/g, "''")}'` : 'NULL';
      const searchParam = search ? `'${search.replace(/'/g, "''")}'` : 'NULL';

      const query = `SELECT * FROM get_admin_produits_vendus_details(${limit}, ${offset}, ${annee}, ${moisParam}, ${structureParam}, ${categorieParam}, ${searchParam}, '${order_by}', '${order_dir}')`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_admin_produits_vendus_details;
      const data: AdminProduitsVendusDetailsResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Liste produits récupérée', {
        count: data.data?.produits?.length,
        total: data.data?.pagination?.total
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération liste produits', error);
      throw error;
    }
  }

  /**
   * Récupère la liste des utilisateurs avec stats et filtres.
   * Fonction PostgreSQL: get_admin_all_utilisateurs(limit, offset, search, id_structure, id_groupe, id_profil, actif, order_by, order_dir, search_structure, search_telephone)
   *
   * Signature étendue (cf. PRD admin-gestion-structures § 4.7) :
   * - p_search_structure VARCHAR DEFAULT NULL : recherche LIKE sur nom_structure
   * - p_search_telephone VARCHAR DEFAULT NULL : recherche stricte (=) sur telephone
   */
  async getAllUtilisateurs(params: AdminAllUtilisateursParams = {}): Promise<AdminAllUtilisateursResponse> {
    try {
      const {
        limit = 20,
        offset = 0,
        search,
        id_structure,
        id_groupe,
        id_profil,
        actif,
        order_by = 'createdat',
        order_dir = 'DESC',
        search_structure,
        search_telephone
      } = params;

      SecurityService.secureLog('log', '👥 [ADMIN] Récupération liste utilisateurs', params);

      // Construire les paramètres
      const searchParam = search ? `'${search.replace(/'/g, "''")}'` : 'NULL';
      const structureParam = id_structure !== undefined ? id_structure : 'NULL';
      const groupeParam = id_groupe !== undefined ? id_groupe : 'NULL';
      const profilParam = id_profil !== undefined ? id_profil : 'NULL';
      const actifParam = actif !== undefined ? actif : 'NULL';
      const searchStructureParam = search_structure ? `'${search_structure.replace(/'/g, "''")}'` : 'NULL';
      const searchTelephoneParam = search_telephone ? `'${search_telephone.replace(/'/g, "''")}'` : 'NULL';

      const query = `SELECT * FROM get_admin_all_utilisateurs(${limit}, ${offset}, ${searchParam}, ${structureParam}, ${groupeParam}, ${profilParam}, ${actifParam}, '${order_by}', '${order_dir}', ${searchStructureParam}, ${searchTelephoneParam})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_admin_all_utilisateurs;
      const data: AdminAllUtilisateursResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Liste utilisateurs récupérée', {
        count: data.data?.utilisateurs?.length,
        total: data.data?.pagination?.total,
        actifs: data.data?.stats?.utilisateurs_actifs
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération liste utilisateurs', error);
      throw error;
    }
  }

  /**
   * Récupère les détails d'un utilisateur spécifique
   * Fonction PostgreSQL: get_admin_detail_utilisateur(id_utilisateur)
   */
  async getDetailUtilisateur(idUtilisateur: number): Promise<AdminDetailUtilisateurResponse> {
    try {
      SecurityService.secureLog('log', '🔍 [ADMIN] Récupération détail utilisateur', { idUtilisateur });

      const query = `SELECT * FROM get_admin_detail_utilisateur(${idUtilisateur})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_admin_detail_utilisateur;
      const data: AdminDetailUtilisateurResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Détail utilisateur récupéré', {
        username: data.data?.utilisateur?.username
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération détail utilisateur', error);
      throw error;
    }
  }

  /**
   * Récupère les données de référence pour les filtres (groupes, profils, structures)
   * Fonction PostgreSQL: get_admin_reference_data()
   */
  async getReferenceData(): Promise<AdminReferenceDataResponse> {
    try {
      SecurityService.secureLog('log', '📋 [ADMIN] Récupération données de référence');

      const query = 'SELECT * FROM get_admin_reference_data()';
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_admin_reference_data;
      const data: AdminReferenceDataResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Données de référence récupérées', {
        groupes: data.data?.groupes?.length,
        profils: data.data?.profils?.length,
        structures: data.data?.structures?.length
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération données de référence', error);
      throw error;
    }
  }

  // ========================================
  // GESTION DES PARTENAIRES
  // ========================================

  /**
   * Liste les partenaires avec pagination et filtres
   * Fonction PostgreSQL: get_admin_list_partenaires(limit, offset, search, actif)
   */
  async getListPartenaires(params: AdminListPartenairesParams = {}): Promise<AdminListPartenairesResponse> {
    try {
      const { limit = 20, offset = 0, search, actif } = params;

      SecurityService.secureLog('log', '🤝 [ADMIN] Récupération liste partenaires', params);

      // Construire les paramètres
      const searchParam = search ? `'${search.replace(/'/g, "''")}'` : 'NULL';
      const actifParam = actif !== undefined ? actif : 'NULL';

      const query = `SELECT * FROM get_admin_list_partenaires(${limit}, ${offset}, ${searchParam}, ${actifParam})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_admin_list_partenaires;
      const data: AdminListPartenairesResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Liste partenaires récupérée', {
        count: data.data?.partenaires?.length,
        total: data.data?.pagination?.total,
        actifs: data.data?.stats?.partenaires_actifs
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération liste partenaires', error);
      throw error;
    }
  }

  /**
   * Ajoute ou modifie un partenaire
   * Fonction PostgreSQL: add_edit_partenaire(nom, telephone, email, adresse, code_promo, commission_pct, valide_jusqua, id_partenaire)
   */
  async addEditPartenaire(params: AddEditPartenaireParams): Promise<AddEditPartenaireResponse> {
    try {
      const {
        nom,
        telephone,
        email,
        adresse,
        code_promo,
        commission_pct = 5,
        valide_jusqua,
        id_partenaire
      } = params;

      const isEdit = !!id_partenaire;
      SecurityService.secureLog('log', `🤝 [ADMIN] ${isEdit ? 'Modification' : 'Création'} partenaire`, { nom, telephone });

      // Construire les paramètres
      const nomParam = `'${nom.replace(/'/g, "''")}'`;
      const telParam = `'${telephone.replace(/'/g, "''")}'`;
      const emailParam = email ? `'${email.replace(/'/g, "''")}'` : 'NULL';
      const adresseParam = adresse ? `'${adresse.replace(/'/g, "''")}'` : 'NULL';
      const codeParam = code_promo ? `'${code_promo.replace(/'/g, "''").toUpperCase()}'` : 'NULL';
      const commissionParam = commission_pct;
      const validiteParam = valide_jusqua ? `'${valide_jusqua}'::DATE` : 'NULL';
      const idParam = id_partenaire ?? 'NULL';

      const query = `SELECT * FROM add_edit_partenaire(${nomParam}, ${telParam}, ${emailParam}, ${adresseParam}, ${codeParam}, ${commissionParam}, ${validiteParam}, ${idParam})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].add_edit_partenaire;
      const data: AddEditPartenaireResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', `✅ [ADMIN] Partenaire ${isEdit ? 'modifié' : 'créé'}`, {
        id: data.data?.id_partenaire,
        code: data.data?.code_promo
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur création/modification partenaire', error);
      throw error;
    }
  }

  /**
   * Active ou désactive un partenaire
   * Fonction PostgreSQL: toggle_partenaire_actif(id_partenaire, actif)
   */
  async togglePartenaireActif(idPartenaire: number, actif?: boolean): Promise<TogglePartenaireResponse> {
    try {
      SecurityService.secureLog('log', '🔄 [ADMIN] Toggle partenaire actif', { idPartenaire, actif });

      const actifParam = actif !== undefined ? actif : 'NULL';
      const query = `SELECT * FROM toggle_partenaire_actif(${idPartenaire}, ${actifParam})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].toggle_partenaire_actif;
      const data: TogglePartenaireResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Statut partenaire modifié', data.message);

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur toggle partenaire actif', error);
      throw error;
    }
  }

  /**
   * Prolonge la validité d'un partenaire
   * Fonction PostgreSQL: prolonger_partenaire(id_partenaire, nouvelle_date, duree_mois)
   */
  async prolongerPartenaire(idPartenaire: number, nouvelleDateOrMois?: string | number): Promise<ProlongerPartenaireResponse> {
    try {
      SecurityService.secureLog('log', '📅 [ADMIN] Prolonger partenaire', { idPartenaire, nouvelleDateOrMois });

      let nouvelleDateParam = 'NULL';
      let dureeMoisParam = 'NULL';

      if (typeof nouvelleDateOrMois === 'string') {
        // C'est une date
        nouvelleDateParam = `'${nouvelleDateOrMois}'::DATE`;
      } else if (typeof nouvelleDateOrMois === 'number') {
        // C'est une durée en mois
        dureeMoisParam = nouvelleDateOrMois.toString();
      }

      const query = `SELECT * FROM prolonger_partenaire(${idPartenaire}, ${nouvelleDateParam}, ${dureeMoisParam})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].prolonger_partenaire;
      const data: ProlongerPartenaireResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Partenaire prolongé', {
        nouvelle_date: data.data?.nouvelle_date_fin
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur prolongation partenaire', error);
      throw error;
    }
  }

  // ========================================
  // STATISTIQUES CODES PROMO
  // ========================================

  /**
   * Récupère les statistiques d'utilisation des codes promo
   * Fonction PostgreSQL: get_admin_stats_codes_promo(annee, mois)
   */
  async getStatsCodesPromo(params: AdminStatsCodesPromoParams = {}): Promise<AdminStatsCodesPromoResponse> {
    try {
      const { annee = new Date().getFullYear(), mois } = params;

      SecurityService.secureLog('log', '🏷️ [ADMIN] Récupération stats codes promo', params);

      const moisParam = mois !== undefined ? mois : 'NULL';
      const query = `SELECT * FROM get_admin_stats_codes_promo(${annee}, ${moisParam})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_admin_stats_codes_promo;
      const data: AdminStatsCodesPromoResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Stats codes promo récupérées', {
        total_inscriptions: data.data?.resume?.total_inscriptions,
        via_partenaires: data.data?.resume?.via_partenaires,
        taux: data.data?.resume?.taux_parrainage
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération stats codes promo', error);
      throw error;
    }
  }

  /**
   * Valide un code promo
   * Fonction PostgreSQL: validate_code_promo(code)
   */
  async validateCodePromo(code: string): Promise<ValidateCodePromoResponse> {
    try {
      SecurityService.secureLog('log', '🔍 [ADMIN] Validation code promo', { code });

      const codeParam = `'${code.replace(/'/g, "''").toUpperCase()}'`;
      const query = `SELECT * FROM validate_code_promo(${codeParam})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].validate_code_promo;
      const data: ValidateCodePromoResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Code promo validé', {
        valid: data.valid,
        partenaire: data.data?.nom_partenaire
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur validation code promo', error);
      throw error;
    }
  }

  /**
   * Récupère les détails complets d'une structure
   * Fonction PostgreSQL: get_une_structure(id_structure)
   */
  async getUneStructure(idStructure: number): Promise<GetUneStructureResponse> {
    try {
      SecurityService.secureLog('log', '🔍 [ADMIN] Récupération détails structure', { idStructure });

      const query = `SELECT * FROM get_une_structure(${idStructure})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune donnée retournée');
      }

      // Extraire le JSON de la réponse
      const rawData = result[0].get_une_structure;
      const data: GetUneStructureResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : rawData;

      SecurityService.secureLog('log', '✅ [ADMIN] Détails structure récupérés', {
        id: data.data?.id_structure,
        nom: data.data?.nom_structure
      });

      return data;

    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur récupération détails structure', error);
      throw error;
    }
  }

  // ========================================
  // GESTION ADMIN AVANCÉE — Structures, Abonnements, Utilisateurs
  // PRD: docs/prd-admin-gestion-structures-2026-04-30.md
  // ⚠️ Phase 1 : squelettes services. Les fonctions PG correspondantes
  // sont en cours de création par le DBA (sauf reset_user_password
  // et add_edit_structure qui existent déjà).
  // ========================================

  /**
   * Logue une action admin dans la table `admin_actions_log`.
   * Helper privé utilisé par les méthodes qui n'ont pas un log
   * intégré côté fonction PG (ex: ajusterMensualite, resetUserPassword).
   *
   * ⚠️ Le log est NON BLOQUANT : si le log échoue, l'action principale
   * reste considérée comme réussie. Cf. recommandation advisor.
   *
   * Fonction PostgreSQL: log_admin_action(p_id_admin, p_action, p_cible_type,
   *   p_cible_id, p_cible_nom, p_ancienne_valeur, p_nouvelle_valeur, p_motif)
   */
  private async logAdminAction(payload: {
    id_admin: number;
    action: AdminActionType;
    cible_type: AdminActionCibleType;
    cible_id: number;
    cible_nom?: string | null;
    ancienne_valeur?: Record<string, unknown> | null;
    nouvelle_valeur?: Record<string, unknown> | null;
    motif?: string | null;
  }): Promise<void> {
    try {
      const cibleNomParam = payload.cible_nom
        ? `'${payload.cible_nom.replace(/'/g, "''")}'`
        : 'NULL';
      const ancienneParam = payload.ancienne_valeur
        ? `'${JSON.stringify(payload.ancienne_valeur).replace(/'/g, "''")}'::jsonb`
        : 'NULL';
      const nouvelleParam = payload.nouvelle_valeur
        ? `'${JSON.stringify(payload.nouvelle_valeur).replace(/'/g, "''")}'::jsonb`
        : 'NULL';
      const motifParam = payload.motif
        ? `'${payload.motif.replace(/'/g, "''")}'`
        : 'NULL';

      const query = `SELECT log_admin_action(${payload.id_admin}, '${payload.action}', '${payload.cible_type}', ${payload.cible_id}, ${cibleNomParam}, ${ancienneParam}, ${nouvelleParam}, ${motifParam})`;
      await databaseService.query(query);

      SecurityService.secureLog('log', '📝 [ADMIN] Action loggée', {
        action: payload.action,
        cible: `${payload.cible_type}#${payload.cible_id}`
      });
    } catch (error) {
      // Log non-bloquant
      SecurityService.secureLog('error', '⚠️ [ADMIN] log_admin_action a échoué (non bloquant)', error);
    }
  }

  /**
   * Modifie la fiche d'une structure (admin).
   * Champs autorisés (cf. PRD § 3.1) : nom_structure, numautorisatioon, id_localite.
   * Les autres champs (mobile_om/wave, email, adresse, logo, code_structure)
   * ne sont PAS modifiables par l'admin.
   *
   * Approche en 2 étapes (cf. décision advisor option B) :
   * 1. add_edit_structure() pour nom_structure + numautorisatioon
   *    (les autres params sont ré-injectés depuis l'état actuel)
   * 2. UPDATE direct sur structures.id_localite (la fonction PG actuelle ne
   *    l'expose pas)
   *
   * TODO DBA: étendre add_edit_structure pour accepter p_id_localite
   * et fusionner ces deux étapes en une transaction atomique.
   */
  async editStructure(params: EditStructureParams): Promise<EditStructureResponse> {
    try {
      SecurityService.secureLog('log', '✏️ [ADMIN] Modification fiche structure', {
        id_structure: params.id_structure,
        nom_structure: params.nom_structure
      });

      // 1. Récupérer l'état actuel (snapshot pour log + ré-injection champs immuables)
      const currentRes = await this.getUneStructure(params.id_structure);
      if (!currentRes.success || !currentRes.data) {
        return { success: false, message: 'Structure introuvable' };
      }
      const current = currentRes.data;
      const ancienneValeur = {
        nom_structure: current.nom_structure,
        numautorisatioon: current.numautorisatioon,
        id_localite: current.id_localite
      };

      // 2. add_edit_structure : on ré-injecte tous les champs actuels
      //    sauf nom_structure et numautorisatioon (qui changent)
      const escName = `'${params.nom_structure.replace(/'/g, "''")}'`;
      const escAdresse = `'${(current.adresse ?? '').replace(/'/g, "''")}'`;
      const escMobileOm = `'${(current.mobile_om ?? '').replace(/'/g, "''")}'`;
      const escMobileWave = `'${(current.mobile_wave ?? '').replace(/'/g, "''")}'`;
      const escNumAuth = `'${(params.numautorisatioon ?? '').replace(/'/g, "''")}'`;
      const escNumMarchand = `'${(current.nummarchand ?? '').replace(/'/g, "''")}'`;
      const escEmail = `'${(current.email ?? '').replace(/'/g, "''")}'`;
      const escLogo = `'${(current.logo ?? '').replace(/'/g, "''")}'`;

      const editQuery = `SELECT add_edit_structure(${current.id_type}, ${escName}, ${escAdresse}, ${escMobileOm}, ${escMobileWave}, ${escNumAuth}, ${escNumMarchand}, ${escEmail}, ${escLogo}, ${params.id_structure})`;
      await databaseService.query(editQuery);

      // 3. UPDATE id_localite (champ non géré par add_edit_structure)
      if (params.id_localite !== current.id_localite) {
        const updateLocaliteQuery = `UPDATE structures SET id_localite = ${params.id_localite} WHERE id_structure = ${params.id_structure}`;
        await databaseService.query(updateLocaliteQuery);
      }

      // 4. Log audit (non bloquant)
      await this.logAdminAction({
        id_admin: params.id_admin,
        action: 'EDIT_STRUCTURE',
        cible_type: 'STRUCTURE',
        cible_id: params.id_structure,
        cible_nom: params.nom_structure,
        ancienne_valeur: ancienneValeur,
        nouvelle_valeur: {
          nom_structure: params.nom_structure,
          numautorisatioon: params.numautorisatioon,
          id_localite: params.id_localite
        }
      });

      SecurityService.secureLog('log', '✅ [ADMIN] Fiche structure modifiée', {
        id_structure: params.id_structure
      });

      return {
        success: true,
        message: 'Structure modifiée avec succès',
        data: {
          id_structure: params.id_structure,
          nom_structure: params.nom_structure,
          numautorisatioon: params.numautorisatioon,
          id_localite: params.id_localite
        }
      };
    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur modification structure', error);
      throw error;
    }
  }

  /**
   * Modifie les paramètres `param_structure` réservés à l'admin.
   * Délègue à `databaseService.editParamStructure()` qui gère l'appel PG.
   *
   * Cf. PRD § 3.2 et § 4.6.
   *
   * ⚠️ Le log d'audit est créé séparément via `logAdminAction()` car
   * `edit_param_structure` ne logue pas par défaut.
   */
  async editParamStructureAdmin(
    idStructure: number,
    params: EditParamStructureAdminParams,
    idAdmin: number
  ): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
    try {
      SecurityService.secureLog('log', '⚙️ [ADMIN] Modification params admin structure', {
        id_structure: idStructure,
        params
      });

      // Délégation à database.service (qui gère les 16 args PG)
      const result = await databaseService.editParamStructure(idStructure, params);

      if (result.success) {
        // Log audit non bloquant
        await this.logAdminAction({
          id_admin: idAdmin,
          action: 'EDIT_PARAM',
          cible_type: 'PARAM_STRUCTURE',
          cible_id: idStructure,
          nouvelle_valeur: { ...params }
        });

        SecurityService.secureLog('log', '✅ [ADMIN] Params admin structure modifiés', {
          id_structure: idStructure
        });
      }

      return result;
    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur modification params admin', error);
      throw error;
    }
  }

  /**
   * Supprime définitivement une structure (HARD DELETE avec cascade).
   * Le snapshot complet et le log sont gérés CÔTÉ FONCTION PG (cf. PRD § 4.4).
   *
   * Fonction PostgreSQL: delete_structure(p_id_structure, p_id_admin)
   * ⚠️ Cette fonction est en cours de création par le DBA.
   */
  async deleteStructure(params: DeleteStructureParams): Promise<DeleteStructureResponse> {
    try {
      SecurityService.secureLog('log', '🗑️ [ADMIN] Suppression structure (HARD DELETE)', params);

      const query = `SELECT delete_structure(${params.id_structure}, ${params.id_admin})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune réponse du serveur');
      }

      const rawData = (result[0] as Record<string, unknown>).delete_structure;
      const data: DeleteStructureResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : (rawData as DeleteStructureResponse);

      SecurityService.secureLog('log', '✅ [ADMIN] Structure supprimée', {
        success: data.success,
        nb_factures: data.nb_factures_supprimees,
        nb_users: data.nb_users_supprimes
      });

      return data;
    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur suppression structure', error);
      throw error;
    }
  }

  /**
   * Offre un abonnement gratuit (méthode 'OFFERT', montant 0) à une structure.
   * Le calcul des dates et le log sont gérés côté fonction PG (cf. PRD § 4.5).
   *
   * Fonction PostgreSQL: add_abonnement_offert(p_id_structure, p_nb_jours, p_motif, p_id_admin)
   * ⚠️ Cette fonction est en cours de création par le DBA.
   */
  async offrirAbonnement(params: OffrirAbonnementParams): Promise<OffrirAbonnementResponse> {
    try {
      SecurityService.secureLog('log', '🎁 [ADMIN] Offrir abonnement', {
        id_structure: params.id_structure,
        nb_jours: params.nb_jours
      });

      const escMotif = `'${params.motif.replace(/'/g, "''")}'`;
      const query = `SELECT add_abonnement_offert(${params.id_structure}, ${params.nb_jours}, ${escMotif}, ${params.id_admin})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune réponse du serveur');
      }

      const rawData = (result[0] as Record<string, unknown>).add_abonnement_offert;
      const data: OffrirAbonnementResponse = typeof rawData === 'string'
        ? JSON.parse(rawData)
        : (rawData as OffrirAbonnementResponse);

      SecurityService.secureLog('log', '✅ [ADMIN] Abonnement offert', {
        id_abonnement: data.data?.id_abonnement,
        date_debut: data.data?.date_debut,
        date_fin: data.data?.date_fin
      });

      return data;
    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur offrir abonnement', error);
      throw error;
    }
  }

  /**
   * Ajuste la mensualité d'une structure (compte_prive uniquement, cf. PRD § 3.5).
   *
   * Workflow :
   * 1. Récupérer ancienne mensualite via getUneStructure (pour snapshot log)
   * 2. Appel `edit_param_structure(...)` avec p_mensualite=nouvelle_mensualite
   * 3. Log séparé via log_admin_action (car edit_param_structure ne logue pas)
   */
  async ajusterMensualite(params: AjusterMensualiteParams): Promise<AjusterMensualiteResponse> {
    try {
      SecurityService.secureLog('log', '💰 [ADMIN] Ajuster mensualité', {
        id_structure: params.id_structure,
        nouvelle_mensualite: params.nouvelle_mensualite
      });

      // Validation côté client (la fonction PG validera aussi)
      if (params.motif.trim().length < 10) {
        return {
          success: false,
          message: 'Le motif est requis (10 caractères minimum)'
        };
      }

      // 1. Snapshot ancienne mensualité (pour log audit)
      let ancienneMensualite: number | undefined;
      try {
        const current = await this.getUneStructure(params.id_structure);
        // mensualite est dans param_structure (pas directement sur StructureDetailData)
        // On cast pour récupérer la valeur si présente
        const dataAsRecord = current.data as unknown as Record<string, unknown>;
        const paramStruct = dataAsRecord.param_structure as Record<string, unknown> | undefined;
        if (paramStruct && typeof paramStruct.mensualite === 'number') {
          ancienneMensualite = paramStruct.mensualite;
        }
      } catch {
        // Snapshot best-effort, on continue
      }

      // 2. Appel edit_param_structure avec uniquement p_mensualite
      const result = await databaseService.editParamStructure(params.id_structure, {
        mensualite: params.nouvelle_mensualite
      });

      if (!result.success) {
        return {
          success: false,
          message: result.message || 'Erreur lors de la mise à jour de la mensualité'
        };
      }

      // 3. Log séparé (non bloquant)
      await this.logAdminAction({
        id_admin: params.id_admin,
        action: 'AJUSTER_MENSUALITE',
        cible_type: 'PARAM_STRUCTURE',
        cible_id: params.id_structure,
        ancienne_valeur: ancienneMensualite !== undefined
          ? { mensualite: ancienneMensualite }
          : null,
        nouvelle_valeur: { mensualite: params.nouvelle_mensualite },
        motif: params.motif
      });

      SecurityService.secureLog('log', '✅ [ADMIN] Mensualité ajustée', {
        id_structure: params.id_structure,
        ancienne: ancienneMensualite,
        nouvelle: params.nouvelle_mensualite
      });

      return {
        success: true,
        message: 'Mensualité ajustée avec succès',
        data: {
          id_structure: params.id_structure,
          ancienne_mensualite: ancienneMensualite,
          nouvelle_mensualite: params.nouvelle_mensualite
        }
      };
    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur ajuster mensualité', error);
      throw error;
    }
  }

  /**
   * Réinitialise le mot de passe d'un utilisateur.
   * Retourne le nouveau MDP en clair pour affichage popup admin (V1, cf. PRD § 5.2).
   *
   * Workflow :
   * 1. Appel `reset_user_password(pid_utilisateur)` qui :
   *    - Génère un nouveau MDP aléatoire
   *    - Met à jour utilisateurs.pwd
   *    - Force pwd_changed=false (à vérifier côté DBA, cf. PRD § Sprint 3)
   *    - Retourne le nouveau MDP en clair (VARCHAR)
   * 2. Log séparé via log_admin_action (non bloquant : si le log échoue,
   *    l'admin doit quand même récupérer le MDP en clair côté UI).
   */
  async resetUserPassword(params: ResetUserPasswordParams): Promise<ResetUserPasswordResponse> {
    try {
      SecurityService.secureLog('log', '🔑 [ADMIN] Reset mot de passe', {
        id_utilisateur: params.id_utilisateur
      });

      const query = `SELECT reset_user_password(${params.id_utilisateur})`;
      const result = await databaseService.query(query);

      if (!result || result.length === 0) {
        throw new Error('Aucune réponse du serveur');
      }

      const rawData = (result[0] as Record<string, unknown>).reset_user_password;
      // reset_user_password retourne directement un VARCHAR (nouveau MDP)
      const newPassword: string = typeof rawData === 'string'
        ? rawData
        : String(rawData ?? '');

      if (!newPassword) {
        return {
          success: false,
          message: 'Impossible de générer le nouveau mot de passe',
          new_password: ''
        };
      }

      // Log audit (non bloquant — ne JAMAIS faire échouer le retour du MDP)
      await this.logAdminAction({
        id_admin: params.id_admin,
        action: 'RESET_PASSWORD',
        cible_type: 'UTILISATEUR',
        cible_id: params.id_utilisateur,
        // ne pas logger le MDP en clair dans la table d'audit
        nouvelle_valeur: { pwd_changed: false, action: 'reset' }
      });

      SecurityService.secureLog('log', '✅ [ADMIN] Mot de passe réinitialisé', {
        id_utilisateur: params.id_utilisateur
      });

      return {
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
        new_password: newPassword
      };
    } catch (error) {
      SecurityService.secureLog('error', '❌ [ADMIN] Erreur reset mot de passe', error);
      throw error;
    }
  }
}

// Export singleton
const adminService = AdminService.getInstance();
export default adminService;
