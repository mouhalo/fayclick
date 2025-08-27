// src/services/database.ts
import SecurityService from '@/services/security.service';
import { API_CONFIG } from '@/config/env';

// Récupération de l'URL de l'API depuis la configuration
const API_URL = API_CONFIG.ENDPOINT;
const DEFAULT_APPLICATION_NAME = 'fayclick'; // Application par défaut

// Interface pour configurer les applications
interface ApplicationConfig {
  name: string;
  description?: string;
  defaultTimeout?: number;
}

// Configuration des applications disponibles
const APPLICATIONS: Record<string, ApplicationConfig> = {
  fayclick: {
    name: 'fayclick',
    description: 'Super App de gestion avec payement Wallet',
    defaultTimeout: 10000
  },
};

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
    return `<?xml version="1.0" encoding="UTF-8"?>
        <request>
            <application>${application_name}</application>
            <requete_sql>${sql_text}</requete_sql>
        </request>`;
  };

  // Méthode pour valider le nom de l'application
  private validerApplication(application_name: string): ApplicationConfig {
    const appConfig = APPLICATIONS[application_name];
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
      
      // Utiliser fetch directement pour éviter les problèmes CORS avec headers personnalisés
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml'
        },
        body: xml
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      // DEBUG: Log détaillé de la réponse (temporaire)
      console.log('🔍 [DEBUG] Réponse API brute:', responseData);
      console.log('🔍 [DEBUG] Type de réponse:', typeof responseData);
      console.log('🔍 [DEBUG] Clés de la réponse:', Object.keys(responseData || {}));
      
      // Log sécurisé de la réponse
      SecurityService.secureLog('log', `Réponse API pour '${appConfig.name}'`, {
        application: appConfig.name,
        responseSize: JSON.stringify(responseData).length,
        data: SecurityService.obfuscateResponse(responseData)
      });
      SecurityService.secureLog('log', 'Analyse de la réponse', {
        dataType: typeof responseData,
        dataKeys: Object.keys(responseData || {})
      });

      // Gérer différents formats de réponse possibles
      if (responseData.status === 'success') {
        console.log('🔍 [DEBUG] Status success détecté');
        // Vérifier d'abord 'datas' (avec un s)
        if (responseData.datas && Array.isArray(responseData.datas)) {
          console.log(`🔍 [DEBUG] Données trouvées: ${responseData.datas.length} éléments`);
          console.log('🔍 [DEBUG] Premier élément:', responseData.datas[0]);
          SecurityService.secureLog('log', `Données trouvées dans responseData.datas: ${responseData.datas.length} éléments`);
          // Les données sont directement dans le tableau, pas dans result_json
          return responseData.datas;
        }
        // Sinon essayer 'data' (sans s)
        console.log('🔍 [DEBUG] Pas de datas, essayant data...');
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
            // Les données sont directement dans le tableau
            return responseData[key];
          }
        }
      }
      
      if (responseData.detail) {
        throw new Error(responseData.detail);
      } else {
        SecurityService.secureLog('log', 'Format de réponse non reconnu', SecurityService.obfuscateResponse(responseData));
        throw new Error('Format de réponse API non reconnu');
      }
    } catch (error) {
      // DEBUG: Log détaillé de l'erreur
      console.error('🚨 [DEBUG] Erreur dans envoyerRequeteApi:', error);
      console.error('🚨 [DEBUG] Application:', application_name);
      console.error('🚨 [DEBUG] Requête SQL:', requeteSql);
      
      SecurityService.secureLog('error', `Erreur API pour l'application '${application_name}'`, {
        application: application_name,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      // Plus d'axios, utilisation de SecureHttpService
      throw new Error(`Erreur réseau: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // Méthode de compatibilité pour l'ancienne signature
  async query(requeteSql: string) {
    return this.envoyerRequeteApi(DEFAULT_APPLICATION_NAME, requeteSql);
  }

  // Méthode pour obtenir la liste des applications configurées
  getApplications(): string[] {
    return Object.keys(APPLICATIONS);
  }

  // Méthode pour ajouter une nouvelle application dynamiquement
  addApplication(name: string, config: Omit<ApplicationConfig, 'name'>) {
    APPLICATIONS[name] = {
      name,
      ...config
    };
  }
}

export default DatabaseService.getInstance();

// Export des types pour utilisation externe
export type { ApplicationConfig };