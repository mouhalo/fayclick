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
      
      // Utiliser fetch avec configuration timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(API_CONFIG.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/json',
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
        
        if (error.message.includes('fetch')) {
          SecurityService.secureLog('error', 'Erreur réseau lors de la connexion à l\'API', {
            endpoint: API_CONFIG.ENDPOINT,
            application: application_name,
            error: error.message
          });
          throw new Error(`Impossible de contacter l'API: ${API_CONFIG.ENDPOINT}`);
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
  async executeFunction(functionName: string, params: string[] = []): Promise<any[]> {
    const paramStr = params.map(p => `'${p}'`).join(', ');
    const query = `SELECT * FROM ${functionName}(${paramStr});`;
    return this.query(query);
  }

  /**
   * Connexion d'agent (ancienne fonction PostgreSQL)
   */
  async connexionAgent(login: string, password: string): Promise<any[]> {
    return this.executeFunction('connexion_agent', [login, password]);
  }

  /**
   * Vérification des identifiants utilisateur (nouvelle fonction PostgreSQL)
   */
  async checkUserCredentials(login: string, password: string): Promise<any[]> {
    return this.executeFunction('check_user_credentials', [login, password]);
  }

  /**
   * Récupération de la liste des événements
   */
  async getListEvents(): Promise<any[]> {
    return this.executeFunction('get_list_events');
  }

  /**
   * Récupération du dashboard d'une structure
   */
  async getDashboard(structureId: string): Promise<any[]> {
    return this.executeFunction('get_dashboard', [structureId]);
  }

  /**
   * Récupération des détails complets d'une structure
   * @param id_structure - ID de la structure
   */
  async getStructureDetails(id_structure: number): Promise<any[]> {
    const query = `SELECT * FROM list_structures WHERE id_structure = ${id_structure};`;
    console.log('🏢 [DATABASE] Récupération détails structure:', {
      id_structure,
      query
    });
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
  addApplication(name: string, config: Omit<ApplicationConfig, 'name'>) {
    // Note: Cette méthode nécessiterait une modification du fichier de config
    // Pour l'instant, log uniquement
    SecurityService.secureLog('warn', `Tentative d'ajout d'application '${name}' non supportée dynamiquement`);
  }
}

export default DatabaseService.getInstance();

// Export des types pour utilisation externe
export type { ApplicationConfig };