/**
 * Service HTTP sécurisé pour FayClick V2
 * Migré depuis old_services/secureHttp.ts
 * Fonctionnalités:
 * - Chiffrement et masquage des requêtes
 * - Gestion automatique des tokens CSRF
 * - Cache en mémoire pour optimiser les performances
 * - Intercepteurs de sécurité pour la production
 */

import SecurityService from './security.service';

interface SecureRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  encrypt?: boolean;
  maskLogs?: boolean;
}

interface SecureResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  encrypted: boolean;
}

class SecureHttpService {
  private static readonly isProduction = process.env.NODE_ENV === 'production';
  private static requestCounter = 0;
  private static requestCache = new Map<string, any>();

  /**
   * Effectue une requête HTTP sécurisée
   */
  static async request<T = any>(config: SecureRequestConfig): Promise<SecureResponse<T>> {
    // Détecter les tentatives de debugging en production
    if (this.isProduction) {
      SecurityService.detectDebugging();
    }

    // Générer un ID unique pour cette requête
    const requestId = `req_${++this.requestCounter}_${Date.now()}`;
    
    // Préparer les données
    const sanitizedData = SecurityService.sanitizeInput(config.data);
    const encryptedData = config.encrypt !== false ? 
      SecurityService.encrypt(JSON.stringify(sanitizedData)) : 
      sanitizedData;

    // Headers sécurisés avec identification FayClick
    const secureHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'X-Timestamp': Date.now().toString(),
      'X-App-Name': 'FayClick-V2',
      'X-App-Version': '2.0.0',
      ...(config.headers || {})
    };

    // Ajouter token CSRF en production
    if (this.isProduction && typeof window !== 'undefined') {
      const csrfToken = SecurityService.generateCSRFToken();
      secureHeaders['X-CSRF-Token'] = csrfToken;
      sessionStorage.setItem('csrf_token', csrfToken);
    }

    // Log sécurisé de la requête
    SecurityService.secureLog('log', `Requête HTTP: ${config.method} ${config.url}`, {
      requestId,
      method: config.method,
      url: this.maskUrl(config.url),
      dataSize: JSON.stringify(sanitizedData).length,
      encrypted: config.encrypt !== false
    });

    try {
      // Cache en mémoire pour éviter les requêtes répétées
      const cacheKey = this.generateCacheKey(config);
      if (config.method === 'GET' && this.requestCache.has(cacheKey)) {
        const cachedResponse = this.requestCache.get(cacheKey);
        SecurityService.secureLog('log', `Réponse depuis le cache: ${requestId}`);
        return cachedResponse;
      }

      // Configuration timeout pour éviter les blocages
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Effectuer la requête avec fetch
      const response = await fetch(config.url, {
        method: config.method,
        headers: secureHeaders,
        body: config.method !== 'GET' ? 
          (config.encrypt !== false ? encryptedData : 
            (typeof config.data === 'string' ? config.data : JSON.stringify(sanitizedData))) : 
          undefined,
        credentials: 'same-origin', // Sécurité CORS
        mode: 'cors',
        cache: 'no-cache', // Éviter le cache navigateur pour les données sensibles
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const rawData = await response.text();
        
        // Déchiffrer si nécessaire
        const decryptedData = config.encrypt !== false ? 
          SecurityService.decrypt(rawData) : 
          rawData;
          
        responseData = JSON.parse(decryptedData);
      } else {
        responseData = await response.text();
      }

      // Obfusquer la réponse pour les logs
      SecurityService.obfuscateResponse(responseData);

      // Log sécurisé de la réponse
      SecurityService.secureLog('log', `Réponse HTTP: ${requestId}`, {
        status: response.status,
        dataSize: JSON.stringify(responseData).length,
        obfuscated: this.isProduction
      });

      const secureResponse: SecureResponse<T> = {
        data: responseData,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        encrypted: config.encrypt !== false
      };

      // Cache pour les requêtes GET (5 minutes)
      if (config.method === 'GET') {
        this.requestCache.set(cacheKey, secureResponse);
        
        setTimeout(() => {
          this.requestCache.delete(cacheKey);
        }, 300000);
      }

      return secureResponse;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        SecurityService.secureLog('error', `Timeout requête HTTP: ${requestId}`, {
          url: this.maskUrl(config.url),
          timeout: '30s'
        });
        throw new Error('Timeout de la requête (30s)');
      }

      SecurityService.secureLog('error', `Erreur requête HTTP: ${requestId}`, {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        url: this.maskUrl(config.url),
        method: config.method
      });
      
      throw error;
    }
  }

  /**
   * Méthodes raccourcies pour les différents types de requêtes
   */
  static async get<T = any>(url: string, config?: Partial<SecureRequestConfig>): Promise<T> {
    const response = await this.request<T>({
      url,
      method: 'GET',
      ...config
    });
    return response.data;
  }

  static async post<T = any>(url: string, data?: any, config?: Partial<SecureRequestConfig>): Promise<T> {
    const response = await this.request<T>({
      url,
      method: 'POST',
      data,
      ...config
    });
    return response.data;
  }

  static async put<T = any>(url: string, data?: any, config?: Partial<SecureRequestConfig>): Promise<T> {
    const response = await this.request<T>({
      url,
      method: 'PUT',
      data,
      ...config
    });
    return response.data;
  }

  static async delete<T = any>(url: string, config?: Partial<SecureRequestConfig>): Promise<T> {
    const response = await this.request<T>({
      url,
      method: 'DELETE',
      ...config
    });
    return response.data;
  }

  /**
   * Masquer les URLs sensibles dans les logs
   */
  private static maskUrl(url: string): string {
    if (!this.isProduction) {
      return url;
    }

    try {
      // Masquer les paramètres sensibles dans l'URL
      const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      const sensitiveParams = [
        'token', 'password', 'key', 'secret', 'phone', 'telephone',
        'login', 'email', 'user_id', 'structure_id'
      ];
      
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          const value = urlObj.searchParams.get(param);
          if (value && value.length > 3) {
            urlObj.searchParams.set(param, value.substring(0, 2) + '***');
          }
        }
      });

      return urlObj.toString();
    } catch (error) {
      // Si l'URL ne peut pas être parsée, masquer partiellement
      return url.substring(0, 20) + '***';
    }
  }

  /**
   * Génère une clé de cache pour les requêtes
   */
  private static generateCacheKey(config: SecureRequestConfig): string {
    const input = config.method + config.url + JSON.stringify(config.data || {});
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Nettoie le cache des requêtes
   */
  static clearCache(): void {
    this.requestCache.clear();
    SecurityService.secureLog('log', 'Cache des requêtes vidé');
  }

  /**
   * Configure les intercepteurs de requêtes pour plus de sécurité
   */
  static setupSecurityInterceptors(): void {
    if (!this.isProduction || typeof window === 'undefined') {
      return;
    }

    // Masquer les erreurs de réseau en production
    window.addEventListener('error', (event) => {
      if (event.message.includes('fetch') || event.message.includes('network')) {
        event.preventDefault();
        SecurityService.secureLog('error', 'Erreur réseau masquée');
      }
    });

    // Détecter les tentatives de manipulation de la console
    if (typeof console !== 'undefined') {
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = (...args) => {
        // En production, filtrer les logs sensibles
        if (args.some(arg => 
          typeof arg === 'string' && 
          (arg.includes('SQL') || arg.includes('password') || 
           arg.includes('token') || arg.includes('fayclick'))
        )) {
          return; // Bloquer les logs sensibles
        }
        originalLog.apply(console, args);
      };

      console.error = (...args) => {
        // Masquer les détails des erreurs en production
        const maskedArgs = args.map(arg => 
          typeof arg === 'string' ? '[ERREUR SYSTÈME FAYCLICK]' : arg
        );
        originalError.apply(console, maskedArgs);
      };

      console.warn = (...args) => {
        // Autoriser seulement les warnings de sécurité FayClick
        if (args.some(arg => 
          typeof arg === 'string' && 
          (arg.includes('[FAYCLICK') || arg.includes('[SECURE]'))
        )) {
          originalWarn.apply(console, args);
        }
      };
    }
  }

  /**
   * Initialise le service HTTP sécurisé
   */
  static initialize(): void {
    this.setupSecurityInterceptors();
    SecurityService.secureLog('log', 'Service HTTP sécurisé FayClick V2 initialisé', {
      production: this.isProduction,
      cacheEnabled: true,
      securityEnabled: this.isProduction
    });
  }
}

export default SecureHttpService;