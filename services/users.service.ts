/**
 * Service de gestion des utilisateurs FayClick V2
 * Gère les opérations CRUD sur les utilisateurs via PostgreSQL
 */

import DatabaseService from './database.service';
import {
  UsersListResponse,
  UtilisateurData,
  AddEditUserParams,
  AddEditUserResponse,
  UserProfilIds
} from '@/types/users';

class UsersService {
  private static instance: UsersService;

  static getInstance(): UsersService {
    if (!this.instance) {
      this.instance = new UsersService();
    }
    return this.instance;
  }

  /**
   * Récupère la liste complète des utilisateurs d'une structure
   * Appelle get_list_utilisateurs(pid_structure)
   *
   * @param id_structure - ID de la structure
   * @returns Liste des utilisateurs avec leurs détails complets
   * @throws Error si la récupération échoue
   */
  async getListUtilisateurs(id_structure: number): Promise<UsersListResponse> {
    try {
      console.log('👥 [USERS SERVICE] Récupération liste utilisateurs:', { id_structure });

      const query = `SELECT * FROM get_list_utilisateurs(${id_structure});`;
      const results = await DatabaseService.query(query);

      console.log('📊 [USERS SERVICE] Résultat brut:', {
        resultsType: typeof results,
        resultsLength: Array.isArray(results) ? results.length : 'N/A',
        results: JSON.stringify(results).substring(0, 500)
      });

      // Parser la réponse PostgreSQL
      const response = this.parseUsersListResponse(results);

      console.log('✅ [USERS SERVICE] Liste utilisateurs récupérée:', {
        id_structure: response.id_structure,
        total: response.total_utilisateurs,
        users: response.data.length,
        usersList: response.data.map(u => ({ id: u.id, username: u.username, profil: u.profil.nom_profil }))
      });

      return response;

    } catch (error) {
      console.error('❌ [USERS SERVICE] Erreur récupération utilisateurs:', error);
      throw new Error(
        `Impossible de récupérer les utilisateurs: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }

  /**
   * Ajoute ou modifie un utilisateur
   * Appelle add_edit_utilisateur(pid_structure, pid_profil, pusername, pteluser, pid_user)
   *
   * @param params - Paramètres de l'utilisateur
   * @returns Résultat de l'opération avec l'ID utilisateur
   * @throws Error si l'opération échoue
   */
  async addEditUtilisateur(params: AddEditUserParams): Promise<AddEditUserResponse> {
    try {
      const isEdit = params.id_user !== null && params.id_user !== undefined;

      console.log('📝 [USERS SERVICE] Ajout/modification utilisateur:', {
        operation: isEdit ? 'EDIT' : 'ADD',
        id_structure: params.id_structure,
        id_profil: params.id_profil,
        username: params.username,
        id_user: params.id_user
      });

      // Validation des données
      this.validateUserParams(params);

      // Échapper les apostrophes pour éviter les injections SQL
      const escapedUsername = params.username.replace(/'/g, "''");
      const escapedTelephone = params.telephone.replace(/'/g, "''");

      // Construction de la requête SQL
      const query = `SELECT * FROM add_edit_utilisateur(
        ${params.id_structure},
        ${params.id_profil},
        '${escapedUsername}',
        '${escapedTelephone}',
        ${params.id_user || 'NULL'}
      );`;

      console.log('🔧 [USERS SERVICE] Requête SQL:', {
        functionName: 'add_edit_utilisateur',
        hasIdUser: !!params.id_user
      });

      const results = await DatabaseService.query(query);

      // Parser la réponse
      const response = this.parseAddEditResponse(results);

      console.log('✅ [USERS SERVICE] Utilisateur sauvegardé:', {
        success: response.success,
        id_user: response.id_user,
        message: response.message
      });

      return response;

    } catch (error) {
      console.error('❌ [USERS SERVICE] Erreur sauvegarde utilisateur:', error);
      throw new Error(
        `Impossible de sauvegarder l'utilisateur: ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }

  /**
   * Récupère uniquement les utilisateurs non-admin (éditables)
   *
   * @param id_structure - ID de la structure
   * @returns Liste des utilisateurs non-admin
   */
  async getEditableUsers(id_structure: number): Promise<UtilisateurData[]> {
    const response = await this.getListUtilisateurs(id_structure);
    return response.data.filter(user => user.profil.id_profil !== UserProfilIds.ADMIN);
  }

  /**
   * Récupère uniquement l'utilisateur admin
   *
   * @param id_structure - ID de la structure
   * @returns Utilisateur admin ou null
   */
  async getAdminUser(id_structure: number): Promise<UtilisateurData | null> {
    const response = await this.getListUtilisateurs(id_structure);
    return response.data.find(user => user.profil.id_profil === UserProfilIds.ADMIN) || null;
  }

  /**
   * Valide les paramètres d'un utilisateur
   * @private
   */
  private validateUserParams(params: AddEditUserParams): void {
    if (!params.id_structure || params.id_structure <= 0) {
      throw new Error('ID de structure invalide');
    }

    if (!params.id_profil || params.id_profil <= 0) {
      throw new Error('ID de profil invalide');
    }

    if (!params.username || params.username.trim() === '') {
      throw new Error('Le nom d\'utilisateur est requis');
    }

    if (!params.telephone || params.telephone.trim() === '') {
      throw new Error('Le numéro de téléphone est requis');
    }

    // Validation du format téléphone sénégalais (basique)
    const phoneRegex = /^(77|78|76|70|75)[0-9]{7}$/;
    const cleanPhone = params.telephone.replace(/\s/g, '');

    if (!phoneRegex.test(cleanPhone)) {
      throw new Error('Format de téléphone invalide (ex: 77 123 45 67)');
    }

    // Ne jamais permettre la modification d'un admin via ce service
    if (params.id_profil === UserProfilIds.ADMIN && params.id_user) {
      throw new Error('La modification de l\'utilisateur admin n\'est pas autorisée');
    }
  }

  /**
   * Parse la réponse de get_list_utilisateurs()
   * @private
   */
  private parseUsersListResponse(results: unknown): UsersListResponse {
    console.log('🔍 [PARSE] Entrée parseUsersListResponse:', {
      type: typeof results,
      isArray: Array.isArray(results),
      length: Array.isArray(results) ? results.length : 'N/A'
    });

    if (!results) {
      throw new Error('Réponse nulle de get_list_utilisateurs');
    }

    let parsedData: UsersListResponse;

    // Cas 1: La réponse est directement l'objet complet (pas dans un tableau)
    if (typeof results === 'object' && !Array.isArray(results)) {
      console.log('📦 [PARSE] Cas 1: Objet direct détecté');
      parsedData = results as UsersListResponse;
    }
    // Cas 2: La réponse est un tableau
    else if (Array.isArray(results) && results.length > 0) {
      console.log('📦 [PARSE] Cas 2: Tableau détecté avec', results.length, 'éléments');
      const firstResult = results[0];

      if (typeof firstResult === 'string') {
        console.log('📦 [PARSE] Cas 2a: Premier élément est une string, parsing JSON...');
        parsedData = JSON.parse(firstResult);
      } else if (firstResult.get_list_utilisateurs) {
        console.log('📦 [PARSE] Cas 2b: Détection clé get_list_utilisateurs');
        const dataStr = firstResult.get_list_utilisateurs;
        parsedData = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
      } else {
        console.log('📦 [PARSE] Cas 2c: Premier élément est l\'objet directement');
        parsedData = firstResult as UsersListResponse;
      }
    } else {
      throw new Error('Format de réponse invalide: tableau vide ou type incorrect');
    }

    console.log('✅ [PARSE] Données parsées:', {
      success: parsedData.success,
      total: parsedData.total_utilisateurs,
      dataIsArray: Array.isArray(parsedData.data),
      dataLength: parsedData.data?.length
    });

    // Validation de la structure de la réponse
    if (!parsedData.success) {
      throw new Error(parsedData.message || 'Erreur lors de la récupération des utilisateurs');
    }

    if (!Array.isArray(parsedData.data)) {
      console.error('❌ [PARSE] parsedData.data n\'est pas un tableau:', parsedData);
      throw new Error('Format de réponse invalide: data doit être un tableau');
    }

    return parsedData;
  }

  /**
   * Parse la réponse de add_edit_utilisateur()
   * @private
   */
  private parseAddEditResponse(results: unknown): AddEditUserResponse {
    console.log('🔍 [PARSE EDIT] Entrée parseAddEditResponse:', {
      type: typeof results,
      isArray: Array.isArray(results),
      results: JSON.stringify(results).substring(0, 300)
    });

    if (!results) {
      throw new Error('Réponse nulle de add_edit_utilisateur');
    }

    let userData: any;

    // Cas 1: Tableau avec objet/string
    if (Array.isArray(results) && results.length > 0) {
      const firstResult = results[0];

      if (typeof firstResult === 'string') {
        console.log('📦 [PARSE EDIT] Cas 1a: String JSON détectée');
        userData = JSON.parse(firstResult);
      } else if (firstResult.add_edit_utilisateur) {
        console.log('📦 [PARSE EDIT] Cas 1b: Clé add_edit_utilisateur détectée');
        const dataStr = firstResult.add_edit_utilisateur;
        userData = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
      } else {
        console.log('📦 [PARSE EDIT] Cas 1c: Objet direct');
        userData = firstResult;
      }
    }
    // Cas 2: Objet direct (pas dans un tableau)
    else if (typeof results === 'object') {
      console.log('📦 [PARSE EDIT] Cas 2: Objet direct détecté');
      userData = results;
    } else {
      throw new Error('Format de réponse invalide');
    }

    console.log('✅ [PARSE EDIT] Données utilisateur parsées:', {
      id: userData.id,
      username: userData.username,
      tel_user: userData.tel_user
    });

    // La réponse contient directement les données utilisateur, pas un objet {success, message}
    // On considère que si on a un ID, l'opération a réussi
    if (userData.id) {
      return {
        success: true,
        message: 'Utilisateur mis à jour avec succès',
        id_user: userData.id
      };
    } else {
      throw new Error('Erreur lors de la sauvegarde de l\'utilisateur');
    }
  }
}

export default UsersService.getInstance();