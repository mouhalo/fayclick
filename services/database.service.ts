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

  /**
   * Détecte le navigateur actuel pour un meilleur diagnostic des erreurs
   * @returns Chaîne décrivant le navigateur détecté
   */
  private detectBrowser(): string {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return 'Server-Side';
    }

    const userAgent = navigator.userAgent;

    // iOS Safari
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream) {
      if (/CriOS/.test(userAgent)) return 'Chrome iOS';
      if (/FxiOS/.test(userAgent)) return 'Firefox iOS';
      return 'Safari iOS';
    }

    // Safari Desktop
    if (/^((?!chrome|android).)*safari/i.test(userAgent)) {
      return 'Safari Desktop';
    }

    // Firefox
    if (/Firefox/.test(userAgent)) {
      return 'Firefox';
    }

    // Edge
    if (/Edg/.test(userAgent)) {
      return 'Edge';
    }

    // Chrome
    if (/Chrome/.test(userAgent)) {
      return 'Chrome';
    }

    // Opera
    if (/OPR/.test(userAgent) || /Opera/.test(userAgent)) {
      return 'Opera';
    }

    return 'Unknown Browser';
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

  async envoyerRequeteApi(application_name: string, requeteSql: string, customTimeout?: number) {
    try {
      console.log('🚀 [DATABASE] === DÉBUT ENVOI REQUÊTE API ===');

      // Valider l'application
      const appConfig = this.validerApplication(application_name);
      console.log('✅ [DATABASE] Application validée:', appConfig.name);

      // Utiliser le timeout personnalisé ou celui par défaut
      const timeout = customTimeout || API_CONFIG.TIMEOUT;

      // Log sécurisé (masqué en production)
      SecurityService.secureLog('log', `Exécution requête SQL pour l'application '${appConfig.name}'`, {
        application: appConfig.name,
        queryLength: requeteSql.length,
        query: SecurityService.maskSensitiveData({ sql: requeteSql })
      });

      // LOG COMPLET DE LA REQUÊTE SQL
      console.log('📝 [DATABASE] Requête SQL complète:', requeteSql);
      console.log('📏 [DATABASE] Longueur requête SQL:', requeteSql.length, 'caractères');

      const xml = this.construireXml(appConfig.name, requeteSql);
      console.log('📦 [DATABASE] XML construit:', xml);
      console.log('📏 [DATABASE] Longueur XML:', xml.length, 'caractères');

      // Log de l'URL utilisée pour debug
      SecurityService.secureLog('log', `Envoi requête vers: ${API_CONFIG.ENDPOINT}`, {
        endpoint: API_CONFIG.ENDPOINT,
        timeout: timeout
      });

      console.log('🌐 [DATABASE] Configuration endpoint:', {
        endpoint: API_CONFIG.ENDPOINT,
        application: appConfig.name,
        requestMethod: 'POST',
        contentType: 'application/xml',
        timeout: timeout
      });

      // Utiliser fetch avec configuration timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Configuration cross-browser compatible
      // Note: 'User-Agent' est un "forbidden header" que les navigateurs bloquent
      // On utilise un header personnalisé X-Client-App à la place
      const headers: HeadersInit = {
        'Content-Type': 'application/xml',
        'Accept': 'application/json',
        'X-Client-App': 'FayClick-V2/1.0',
        'X-Requested-With': 'XMLHttpRequest'
      };

      const response = await fetch(API_CONFIG.ENDPOINT, {
        method: 'POST',
        headers,
        body: xml,
        signal: controller.signal,
        // Mode CORS explicite pour Firefox/Safari
        mode: 'cors',
        // Inclure les credentials pour les cookies de session si nécessaires
        credentials: 'same-origin',
        // Cache control pour éviter les problèmes de cache navigateur
        cache: 'no-cache'
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
      // Gestion des erreurs avec détails - Compatible tous navigateurs
      if (error instanceof Error) {
        // Timeout (AbortError)
        if (error.name === 'AbortError') {
          const timeoutUsed = customTimeout || API_CONFIG.TIMEOUT;
          SecurityService.secureLog('error', `Timeout requête API (${timeoutUsed}ms)`);
          throw new Error(`Timeout de la requête (${timeoutUsed}ms)`);
        }

        // Détection erreurs réseau cross-browser
        // Chrome: "Failed to fetch"
        // Firefox: "NetworkError when attempting to fetch resource"
        // Safari/iOS: "Load failed" ou "The Internet connection appears to be offline"
        const networkErrorPatterns = [
          'fetch',
          'Failed to fetch',
          'NetworkError',
          'Load failed',
          'Network request failed',
          'The Internet connection appears to be offline',
          'A server with the specified hostname could not be found',
          'The network connection was lost',
          'ERR_',
          'CORS'
        ];

        const isNetworkError = networkErrorPatterns.some(pattern =>
          error.message.toLowerCase().includes(pattern.toLowerCase()) ||
          error.name.toLowerCase().includes(pattern.toLowerCase())
        );

        // Détection erreur TypeError (Firefox lance parfois TypeError au lieu de NetworkError)
        const isTypeError = error.name === 'TypeError' && (
          error.message.includes('fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Failed')
        );

        if (isNetworkError || isTypeError) {
          // Détecter le navigateur pour un message d'erreur plus précis
          const browserInfo = this.detectBrowser();

          SecurityService.secureLog('error', 'Erreur réseau lors de la connexion à l\'API', {
            endpoint: API_CONFIG.ENDPOINT,
            application: application_name,
            error: error.message,
            errorType: error.name || 'Unknown',
            browser: browserInfo
          });

          console.error('🔴 [DATABASE] Détails erreur réseau:', {
            endpoint: API_CONFIG.ENDPOINT,
            errorMessage: error.message,
            errorName: error.name,
            browser: browserInfo,
            stack: error.stack
          });

          // Message d'erreur utilisateur plus explicite
          let userMessage = `Impossible de contacter le serveur.`;
          if (browserInfo.includes('Safari') || browserInfo.includes('iOS')) {
            userMessage += ` Vérifiez votre connexion internet et réessayez.`;
          } else if (browserInfo.includes('Firefox')) {
            userMessage += ` Si le problème persiste, essayez de vider le cache du navigateur.`;
          }

          throw new Error(userMessage);
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
  async query(requeteSql: string, customTimeout?: number) {
    return this.envoyerRequeteApi(API_CONFIG.APPLICATION_NAME, requeteSql, customTimeout);
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
   * Récupération des détails complets d'une structure avec état abonnement
   * Utilise get_une_structure() qui retourne aussi etat_abonnement avec jours_restants
   * @param id_structure - ID de la structure
   */
  async getStructureDetails(id_structure: number): Promise<unknown[]> {
    const query = `SELECT get_une_structure(${id_structure});`;
    console.log('🏢 [DATABASE] Récupération détails structure via get_une_structure:', {
      id_structure
    });

    try {
      const results = await this.query(query);

      if (results && results.length > 0) {
        const response = results[0];

        // Extraire la réponse JSON de la fonction PostgreSQL
        let parsedData;
        if (response.get_une_structure) {
          parsedData = typeof response.get_une_structure === 'string'
            ? JSON.parse(response.get_une_structure)
            : response.get_une_structure;
        } else {
          parsedData = response;
        }

        // La fonction retourne {success: true, data: {...}}
        if (parsedData.success && parsedData.data) {
          console.log('🏢 [DATABASE] Structure récupérée avec etat_abonnement:', {
            id_structure: parsedData.data.id_structure,
            nom_structure: parsedData.data.nom_structure,
            etat_abonnement: parsedData.data.etat_abonnement
          });
          return [parsedData.data];
        }

        console.warn('🏢 [DATABASE] Réponse inattendue de get_une_structure:', parsedData);
        return [];
      }

      return [];
    } catch (error) {
      console.error('🏢 [DATABASE] Erreur get_une_structure:', error);
      throw error;
    }
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
   * 🆕 Récupération des droits utilisateur depuis get_mes_droits()
   * Appelle la fonction PostgreSQL get_mes_droits(pid_structure, pid_profil)
   *
   * @param id_structure - ID de la structure
   * @param id_profil - ID du profil utilisateur
   * @returns Données brutes JSON depuis PostgreSQL
   */
  async getUserRights(id_structure: number, id_profil: number): Promise<unknown[]> {
    const query = `SELECT * FROM get_mes_droits(${id_structure}, ${id_profil});`;

    console.log('🔑 [DATABASE] Récupération droits utilisateur:', {
      id_structure,
      id_profil,
      query
    });

    return this.query(query);
  }

  /**
   * 🆕 Récupération de la liste des clients d'une structure
   * Appelle la fonction PostgreSQL get_list_clients(pid_structure, ptel_client)
   *
   * @param id_structure - ID de la structure
   * @param tel_client - Téléphone du client (optionnel, '' pour tous les clients)
   * @returns Liste des clients avec leurs informations
   */
  async getListClients(id_structure: number, tel_client: string = ''): Promise<unknown[]> {
    // Échapper les quotes dans le téléphone
    const escapedTel = tel_client.replace(/'/g, "''");

    // Construction de la requête avec les paramètres typés
    const query = `SELECT * FROM get_list_clients(${id_structure}, '${escapedTel}');`;

    console.log('👥 [DATABASE] Récupération liste clients:', {
      id_structure,
      tel_client: tel_client || '(tous)',
      query
    });

    return this.query(query);
  }

  /**
   * 🆕 Vérification si un nom de structure existe déjà
   * @param nom_structure - Nom de la structure à vérifier
   * @returns true si le nom existe déjà, false sinon
   */
  async checkStructureNameExists(nom_structure: string): Promise<boolean> {
    try {
      // Échapper les quotes et mettre en majuscules (comme lors de l'insertion)
      const escapedName = nom_structure.toUpperCase().trim().replace(/'/g, "''");

      const query = `SELECT 1 FROM structures WHERE UPPER(nom_structure) = '${escapedName}' LIMIT 1;`;

      console.log('🔍 [DATABASE] Vérification nom structure:', {
        nom_recherche: nom_structure,
        query
      });

      const result = await this.query(query);

      // Si on a un résultat, le nom existe déjà
      const exists = Array.isArray(result) && result.length > 0;

      console.log(exists ? '⚠️ [DATABASE] Nom de structure déjà pris' : '✅ [DATABASE] Nom de structure disponible');

      return exists;
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur vérification nom structure', error);
      // En cas d'erreur, on considère que le nom n'est pas pris
      // pour ne pas bloquer l'utilisateur
      return false;
    }
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