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
  GetUneStructureResponse
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
   * Récupère la liste des utilisateurs avec stats et filtres
   * Fonction PostgreSQL: get_admin_all_utilisateurs(limit, offset, search, id_structure, id_groupe, id_profil, actif, order_by, order_dir)
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
        order_dir = 'DESC'
      } = params;

      SecurityService.secureLog('log', '👥 [ADMIN] Récupération liste utilisateurs', params);

      // Construire les paramètres
      const searchParam = search ? `'${search.replace(/'/g, "''")}'` : 'NULL';
      const structureParam = id_structure !== undefined ? id_structure : 'NULL';
      const groupeParam = id_groupe !== undefined ? id_groupe : 'NULL';
      const profilParam = id_profil !== undefined ? id_profil : 'NULL';
      const actifParam = actif !== undefined ? actif : 'NULL';

      const query = `SELECT * FROM get_admin_all_utilisateurs(${limit}, ${offset}, ${searchParam}, ${structureParam}, ${groupeParam}, ${profilParam}, ${actifParam}, '${order_by}', '${order_dir}')`;
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
}

// Export singleton
const adminService = AdminService.getInstance();
export default adminService;
