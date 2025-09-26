/**
 * Service de base de données pour FayClick V2
 * Migré depuis old_services/database.ts
 * Communication XML avec l'API PostgreSQL
 */

import SecurityService from './security.service';
import { API_CONFIG, APPLICATIONS_CONFIG } from '@/config/env';

// Interface pour configurer les applications
interface ApplicationConfig {
  name: string;
  description?: string;
  defaultTimeout?: number;
}

class DatabaseService {
  private static instance: DatabaseService;
  
  static getInstance(): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService();
    }
    return this.instance;
  }

  private construireXml = (application_name: string, requeteSql: string) => {
    const sql_text = requeteSql.replace(/\n/g, ' ').trim();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <application>${application_name}</application>
    <requete_sql>${sql_text}</requete_sql>
</request>`;
    
    // Log du XML construit pour debug
    console.log('🔵 [DATABASE] XML Request construit:', {
      application: application_name,
      requete: sql_text,
      xmlComplet: xml
    });
    
    return xml;
  };

  // Méthode pour valider le nom de l'application
  private validerApplication(application_name: string): ApplicationConfig {
    const appConfig = APPLICATIONS_CONFIG[application_name as keyof typeof APPLICATIONS_CONFIG];
    if (!appConfig) {
      SecurityService.secureLog('warn', `Application '${application_name}' non configurée, utilisation des paramètres par défaut`);
      return {
        name: application_name,
        defaultTimeout: 10000
      };
    }
    return appConfig;
  }

  async envoyerRequeteApi(application_name: string, requeteSql: string) {
    try {
      // Valider l'application
      const appConfig = this.validerApplication(application_name);
      
      // Log sécurisé (masqué en production)
      SecurityService.secureLog('log', `Exécution requête SQL pour l'application '${appConfig.name}'`, {
        application: appConfig.name,
        queryLength: requeteSql.length,
        query: SecurityService.maskSensitiveData({ sql: requeteSql })
      });
      
      const xml = this.construireXml(appConfig.name, requeteSql);
      
      // Log de l'URL utilisée pour debug
      SecurityService.secureLog('log', `Envoi requête vers: ${API_CONFIG.ENDPOINT}`, {
        endpoint: API_CONFIG.ENDPOINT,
        timeout: API_CONFIG.TIMEOUT
      });
      
      console.log('🌐 [DATABASE] Configuration endpoint:', {
        endpoint: API_CONFIG.ENDPOINT,
        application: appConfig.name,
        requestMethod: 'POST',
        contentType: 'application/xml'
      });
      
      // Utiliser fetch avec configuration timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(API_CONFIG.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/json',
          'User-Agent': 'FayClick-V2/1.0'
        },
        body: xml,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('🟢 [DATABASE] Response brute reçue:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('🔴 [DATABASE] Erreur parsing JSON:', e);
        throw new Error('Réponse API invalide (non JSON)');
      }

      // Log de debug détaillé
      console.log('🟡 [DATABASE] Réponse API parsée:', {
        status: response.status,
        contentType: response.headers.get('content-type'),
        dataType: typeof responseData,
        dataKeys: Object.keys(responseData || {}),
        hasStatus: 'status' in (responseData || {}),
        hasData: 'data' in (responseData || {}),
        hasDatas: 'datas' in (responseData || {}),
        responseComplete: responseData
      });
      
      // Log sécurisé de la réponse
      SecurityService.secureLog('log', `Réponse API pour '${appConfig.name}'`, {
        application: appConfig.name,
        responseSize: JSON.stringify(responseData).length,
        data: SecurityService.obfuscateResponse(responseData)
      });

      // Gérer différents formats de réponse possibles
      if (responseData.status === 'success') {
        console.log('✅ [DATABASE] Status success détecté');
        console.log('📊 [DATABASE] Structure de la réponse:', {
          hasMessage: !!responseData.message,
          message: responseData.message,
          hasDatas: !!responseData.datas,
          datasLength: responseData.datas?.length,
          hasData: !!responseData.data,
          dataLength: responseData.data?.length
        });
        
        // Vérifier d'abord 'datas' (avec un s)
        if (responseData.datas && Array.isArray(responseData.datas)) {
          console.log(`✅ [DATABASE] Données trouvées dans responseData.datas: ${responseData.datas.length} éléments`);
          return responseData.datas;
        }
        
        // Sinon essayer 'data' (sans s)
        console.log('⚠️ [DATABASE] Pas de datas, essayant data...');
        return responseData.data || [];
        
      } else if (Array.isArray(responseData)) {
        // Si la réponse est directement un tableau
        SecurityService.secureLog('log', 'La réponse est un tableau direct');
        return responseData;
        
      } else if (responseData && typeof responseData === 'object') {
        // Si la réponse est un objet avec une propriété différente
        const possibleDataKeys = ['data', 'datas', 'results', 'rows', 'records'];
        for (const key of possibleDataKeys) {
          if (responseData[key] && Array.isArray(responseData[key])) {
            SecurityService.secureLog('log', `Données trouvées dans responseData.${key}: ${responseData[key].length} éléments`);
            return responseData[key];
          }
        }
        
        // Si aucune propriété tableau n'est trouvée, retourner l'objet
        SecurityService.secureLog('log', 'Aucun tableau trouvé, retour de l\'objet complet');
        return responseData;
      }
      
      // Gestion des erreurs
      if (responseData.detail) {
        throw new Error(responseData.detail);
      } else if (responseData.error) {
        throw new Error(responseData.error);
      } else if (responseData.message) {
        throw new Error(responseData.message);
      } else {
        SecurityService.secureLog('error', 'Format de réponse non reconnu', SecurityService.obfuscateResponse(responseData));
        throw new Error('Format de réponse API non reconnu');
      }
      
    } catch (error) {
      // Gestion des erreurs avec détails
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          SecurityService.secureLog('error', `Timeout requête API (${API_CONFIG.TIMEOUT}ms)`);
          throw new Error(`Timeout de la requête (${API_CONFIG.TIMEOUT}ms)`);
        }
        
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          SecurityService.secureLog('error', 'Erreur réseau lors de la connexion à l\'API', {
            endpoint: API_CONFIG.ENDPOINT,
            application: application_name,
            error: error.message,
            errorType: error.name || 'Unknown'
          });
          
          console.error('🔴 [DATABASE] Détails erreur réseau:', {
            endpoint: API_CONFIG.ENDPOINT,
            errorMessage: error.message,
            errorName: error.name,
            stack: error.stack
          });
          
          throw new Error(`Impossible de contacter l'API: ${API_CONFIG.ENDPOINT}. Erreur: ${error.message}`);
        }
      }
      
      SecurityService.secureLog('error', `Erreur API pour l'application '${application_name}'`, {
        application: application_name,
        endpoint: API_CONFIG.ENDPOINT,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      
      throw new Error(`Erreur base de données: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // Méthode de compatibilité pour l'ancienne signature
  async query(requeteSql: string) {
    return this.envoyerRequeteApi(API_CONFIG.APPLICATION_NAME, requeteSql);
  }

  // Méthodes utilitaires pour les requêtes courantes
  
  /**
   * Exécute une fonction PostgreSQL avec paramètres
   */
  async executeFunction(functionName: string, params: string[] = []): Promise<unknown[]> {
    const paramStr = params.map(p => {
      // Gérer les types numériques (ne pas les entourer de quotes)
      if (/^\d+$/.test(p)) {
        return `${p}::integer`;
      }
      // Échapper les quotes dans les chaînes
      const escapedParam = p.replace(/'/g, "''");
      return `'${escapedParam}'::varchar`;
    }).join(', ');
    const query = `SELECT * FROM ${functionName}(${paramStr});`;
    console.log('🔧 [DATABASE] Exécution fonction:', {
      functionName,
      params: params.length,
      query
    });
    return this.query(query);
  }

  /**
   * Connexion d'agent (ancienne fonction PostgreSQL)
   */
  async connexionAgent(login: string, password: string): Promise<unknown[]> {
    return this.executeFunction('connexion_agent', [login, password]);
  }

  /**
   * Vérification des identifiants utilisateur (nouvelle fonction PostgreSQL)
   */
  async checkUserCredentials(login: string, password: string): Promise<unknown[]> {
    return this.executeFunction('check_user_credentials', [login, password]);
  }

  /**
   * Vérification des identifiants - VERSION CORRIGÉE
   * Force les deux paramètres en varchar pour éviter la conversion automatique des mots de passe numériques
   */
  async checkUserCredentialsFixed(login: string, password: string): Promise<unknown[]> {
    // Échapper les quotes dans les paramètres
    const escapedLogin = login.replace(/'/g, "''");
    const escapedPassword = password.replace(/'/g, "''");
    
    // Construction manuelle de la requête pour forcer les types varchar
    const query = `SELECT * FROM check_user_credentials('${escapedLogin}'::varchar, '${escapedPassword}'::varchar);`;
    
    console.log('🔐 [DATABASE] Requête auth corrigée:', {
      functionName: 'check_user_credentials',
      loginLength: login.length,
      passwordLength: password.length,
      query
    });
    
    return this.query(query);
  }

  /**
   * Récupération de la liste des événements
   */
  async getListEvents(): Promise<unknown[]> {
    return this.executeFunction('get_list_events');
  }

  /**
   * Récupération du dashboard d'une structure
   */
  async getDashboard(structureId: string): Promise<unknown[]> {
    return this.executeFunction('get_dashboard', [structureId]);
  }

  /**
   * Récupération des détails complets d'une structure
   * @param id_structure - ID de la structure
   */
  async getStructureDetails(id_structure: number): Promise<unknown[]> {
    const query = `SELECT * FROM list_structures WHERE id_structure = ${id_structure};`;
    console.log('🏢 [DATABASE] Récupération détails structure:', {
      id_structure,
      query
    });
    return this.query(query);
  }

  /**
   * Récupération des types de structure disponibles
   */

  /**
   * Demande de récupération de mot de passe - VERSION CORRIGÉE
   * Appelle add_demande_password avec les paramètres forcés en varchar
   * IMPORTANT: Ne jamais logger le pwd_temp pour des raisons de sécurité
   */
  async requestPasswordReset(login: string, telephone: string): Promise<unknown> {
    try {
      // Log sécurisé sans données sensibles
      SecurityService.secureLog('log', `🔐 [DATABASE] Demande de récupération pour: ${login.substring(0, 3)}***`);
      
      // Échapper les quotes dans les paramètres
      const escapedLogin = login.replace(/'/g, "''");
      const escapedTelephone = telephone.replace(/'/g, "''");
      
      // Construction manuelle de la requête pour forcer les types varchar
      const query = `SELECT * FROM add_demande_password('${escapedLogin}'::varchar, '${escapedTelephone}'::varchar);`;
      
      console.log('🔐 [DATABASE] Requête demande password:', {
        functionName: 'add_demande_password',
        loginLength: login.length,
        telephoneLength: telephone.length
        // Ne jamais logger la requête complète pour des raisons de sécurité
      });
      
      const results = await this.query(query);
      
      if (results && results.length > 0) {
        const response = results[0];
        
        // L'API retourne: {"datas":[{"add_demande_password":{"status":"success",...}}]}
        // Extraire les données de la structure imbriquée
        let data;
        if (response.add_demande_password) {
          // Structure directe: {add_demande_password: {...}}
          const functionResult = response.add_demande_password;
          data = typeof functionResult === 'string' ? JSON.parse(functionResult) : functionResult;
        } else {
          // Structure classique pour les autres fonctions
          data = typeof response === 'string' ? JSON.parse(response) : response;
        }
        
        // Ne jamais logger le pwd_temp
        SecurityService.secureLog('log', `✅ [DATABASE] Demande créée avec ID: ${data.message?.split(':')[1]?.trim()}`);
        
        return data;
      }
      
      throw new Error('Aucune réponse de la base de données');
    } catch (error: unknown) {
      SecurityService.secureLog('error', `❌ [DATABASE] Erreur demande récupération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      throw error;
    }
  }

  /**
   * Vérification du code temporaire et réinitialisation du mot de passe - VERSION CORRIGÉE
   * Appelle add_check_demande avec les paramètres forcés en varchar
   * IMPORTANT: Ne jamais logger le nouveau mot de passe
   */
  async verifyPasswordResetCode(login: string, telephone: string, code: string): Promise<unknown> {
    try {
      // Log sécurisé sans le code
      SecurityService.secureLog('log', `🔐 [DATABASE] Vérification code pour: ${login.substring(0, 3)}***`);
      
      // Échapper les quotes dans les paramètres
      const escapedLogin = login.replace(/'/g, "''");
      const escapedTelephone = telephone.replace(/'/g, "''");
      const escapedCode = code.replace(/'/g, "''");
      
      // Construction manuelle de la requête pour forcer les types varchar
      const query = `SELECT * FROM add_check_demande('${escapedLogin}'::varchar, '${escapedTelephone}'::varchar, '${escapedCode}'::varchar);`;
      
      console.log('🔐 [DATABASE] Requête vérification code:', {
        functionName: 'add_check_demande',
        loginLength: login.length,
        telephoneLength: telephone.length,
        codeLength: code.length
        // Ne jamais logger la requête complète ni le code
      });
      
      const results = await this.query(query);
      
      if (results && results.length > 0) {
        const response = results[0];
        
        // L'API retourne: {"datas":[{"add_check_demande":{"status":"success",...}}]}
        // Extraire les données de la structure imbriquée
        let data;
        if (response.add_check_demande) {
          // Structure directe: {add_check_demande: {...}}
          const functionResult = response.add_check_demande;
          data = typeof functionResult === 'string' ? JSON.parse(functionResult) : functionResult;
        } else {
          // Structure classique pour les autres fonctions
          data = typeof response === 'string' ? JSON.parse(response) : response;
        }
        
        if (data.status === 'success') {
          // Ne jamais logger le nouveau_password
          SecurityService.secureLog('log', `✅ [DATABASE] Mot de passe réinitialisé avec succès pour: ${data.utilisateur}`);
        } else {
          SecurityService.secureLog('warn', `⚠️ [DATABASE] Code invalide ou expiré`);
        }
        
        return data;
      }
      
      throw new Error('Aucune réponse de la base de données');
    } catch (error: unknown) {
      SecurityService.secureLog('error', `❌ [DATABASE] Erreur vérification code: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      throw error;
    }
  }

  /**
   * Inscription d'un nouveau marchand via add_edit_inscription
   */
  async registerMerchant(
    p_id_type: number,
    p_nom_structure: string,
    p_adresse: string,
    p_mobile_om: string,
    p_mobile_wave: string = '',
    p_numautorisatioon: string = '',
    p_nummarchand: string = '',
    p_email: string = '',
    p_logo: string = '',
    p_nom_service: string = 'SERVICES',
    p_id_structure: number = 0
  ): Promise<unknown[]> {
    return this.executeFunction('add_edit_inscription', [
      p_id_type.toString(),
      p_nom_structure,
      p_adresse,
      p_mobile_om,
      p_mobile_wave,
      p_numautorisatioon,
      p_nummarchand,
      p_email,
      p_logo,
      p_nom_service,
      p_id_structure.toString()
    ]);
  }

  /**
   * Met à jour les informations d'un utilisateur
   * Appelle la fonction PostgreSQL add_edit_utilisateur
   * @param userData - Données de l'utilisateur à mettre à jour
   * @returns Promise avec le résultat de la mise à jour
   */
  async updateUser(userData: {
    id_structure: number;
    id_profil: number;
    username: string;
    telephone: string;
    id_utilisateur: number;
  }): Promise<unknown[]> {
    console.log('👤 [DATABASE] Mise à jour utilisateur:', {
      id_utilisateur: userData.id_utilisateur,
      username: userData.username
    });

    // Validation des champs requis
    if (!userData.id_utilisateur || userData.id_utilisateur <= 0) {
      throw new Error('ID utilisateur invalide');
    }
    if (!userData.username || userData.username.trim() === '') {
      throw new Error('Le nom d\'utilisateur est requis');
    }
    if (!userData.telephone || userData.telephone.trim() === '') {
      throw new Error('Le téléphone est requis');
    }

    // Échapper les apostrophes dans les chaînes
    const escapedUsername = userData.username.replace(/'/g, "''");
    const escapedTelephone = userData.telephone.replace(/'/g, "''");

    // Construction directe de la requête SQL
    const query = `SELECT add_edit_utilisateur(${userData.id_structure}, ${userData.id_profil}, '${escapedUsername}', '${escapedTelephone}', ${userData.id_utilisateur});`;

    console.log('📝 [DATABASE] Requête SQL updateUser:', {
      functionName: 'add_edit_utilisateur',
      id_utilisateur: userData.id_utilisateur
    });

    return this.query(query);
  }

  /**
   * Change le mot de passe d'un utilisateur
   * Appelle la fonction PostgreSQL change_user_password
   * @param userId - ID de l'utilisateur
   * @param oldPassword - Ancien mot de passe
   * @param newPassword - Nouveau mot de passe
   * @returns Promise avec le résultat du changement (true/false)
   */
  async changeUserPassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    console.log('🔐 [DATABASE] Changement de mot de passe pour utilisateur:', userId);

    // Validation des champs
    if (!userId || userId <= 0) {
      throw new Error('ID utilisateur invalide');
    }
    if (!oldPassword) {
      throw new Error('L\'ancien mot de passe est requis');
    }
    if (!newPassword) {
      throw new Error('Le nouveau mot de passe est requis');
    }
    if (newPassword.length < 6) {
      throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
    }

    // Échapper les apostrophes dans les chaînes
    const escapedOldPassword = oldPassword.replace(/'/g, "''");
    const escapedNewPassword = newPassword.replace(/'/g, "''");

    // Construction directe de la requête SQL
    const query = `SELECT change_user_password(${userId}, '${escapedOldPassword}', '${escapedNewPassword}');`;

    console.log('📝 [DATABASE] Requête SQL changePassword:', {
      functionName: 'change_user_password',
      id_utilisateur: userId
    });

    const result = await this.query(query);
    
    // Vérifier le résultat de la fonction
    const changeResult = result?.[0]?.change_user_password;
    
    if (changeResult === true || changeResult === 't' || changeResult === 1) {
      console.log('✅ [DATABASE] Mot de passe changé avec succès');
      return true;
    } else {
      console.log('⚠️ [DATABASE] Échec du changement de mot de passe');
      return false;
    }
  }

  /**
   * Mise à jour complète d'une structure existante
   * Appelle directement la fonction PostgreSQL add_edit_structure
   * @param structure - Objet contenant toutes les données de la structure
   * @returns Promise avec le résultat de la mise à jour
   */
  async updateStructure(structure: {
    id_structure: number;
    id_type: number;
    nom_structure: string;
    adresse: string;
    mobile_om: string;
    mobile_wave?: string;
    mobile_free?: string;
    numautorisatioon?: string;
    nummarchand?: string;
    email?: string;
    logo?: string;
  }): Promise<unknown[]> {
    console.log('🏢 [DATABASE] Mise à jour structure:', {
      id_structure: structure.id_structure,
      nom_structure: structure.nom_structure
    });

    // Validation des champs requis
    if (!structure.id_structure || structure.id_structure <= 0) {
      throw new Error('ID de structure invalide');
    }
    if (!structure.nom_structure || structure.nom_structure.trim() === '') {
      throw new Error('Le nom de la structure est requis');
    }
    if (!structure.adresse || structure.adresse.trim() === '') {
      throw new Error('L\'adresse est requise');
    }
    if (!structure.mobile_om) {
      throw new Error('Le numéro Orange Money est requis');
    }

    // Échapper les apostrophes dans les chaînes pour éviter les injections SQL
    const escapedNomStructure = structure.nom_structure.replace(/'/g, "''");
    const escapedAdresse = structure.adresse.replace(/'/g, "''");
    const escapedMobileOm = structure.mobile_om.replace(/'/g, "''");
    const escapedMobileWave = (structure.mobile_wave || '').replace(/'/g, "''");
    const escapedNumAutorisation = (structure.numautorisatioon || '').replace(/'/g, "''");
    const escapedNumMarchand = (structure.nummarchand || '').replace(/'/g, "''");
    const escapedEmail = (structure.email || '').replace(/'/g, "''");
    const escapedLogo = (structure.logo || '').replace(/'/g, "''");

    // Construction directe de la requête SQL pour appeler la fonction PostgreSQL
    // Sans forçage de type pour éviter les erreurs XML
    const query = `SELECT add_edit_structure(${structure.id_type}, '${escapedNomStructure}', '${escapedAdresse}', '${escapedMobileOm}', '${escapedMobileWave}', '${escapedNumAutorisation}', '${escapedNumMarchand}', '${escapedEmail}', '${escapedLogo}', ${structure.id_structure});`;

    console.log('📝 [DATABASE] Requête SQL updateStructure:', {
      functionName: 'add_edit_structure',
      id_structure: structure.id_structure
    });

    // Exécution directe de la requête
    return this.query(query);
  }

  /**
   * Récupération des types de structure disponibles
   */
  async getStructureTypes(): Promise<unknown[]> {
    const query = 'SELECT id_type, nom_type FROM type_structure WHERE id_type != 0 ORDER BY nom_type';
    console.log('📄 [DATABASE] Récupération types structure');
    return this.query(query);
  }

  /**
   * Test de connectivité de l'API
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as test_connection;');
      SecurityService.secureLog('log', 'Test de connectivité réussi', { result });
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      SecurityService.secureLog('error', 'Échec du test de connectivité', error);
      return false;
    }
  }

  // Méthode pour obtenir la liste des applications configurées
  getApplications(): string[] {
    return Object.keys(APPLICATIONS_CONFIG);
  }

  // Méthode pour ajouter une nouvelle application dynamiquement
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  addApplication(name: string, _config: Omit<ApplicationConfig, 'name'>) {
    // Note: Cette méthode nécessiterait une modification du fichier de config
    // Pour l'instant, log uniquement
    SecurityService.secureLog('warn', `Tentative d'ajout d'application '${name}' non supportée dynamiquement`);
  }
}

export default DatabaseService.getInstance();

// Export des types pour utilisation externe
export type { ApplicationConfig };