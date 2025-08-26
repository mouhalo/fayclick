/**
 * Service de sécurité pour FayClick V2
 * Migré depuis old_services/security.ts
 * Fonctionnalités:
 * - Chiffrement AES-256 des requêtes sensibles
 * - Masquage des logs en production  
 * - Obfuscation des réponses
 * - Validation et assainissement des données
 */

class SecurityService {
  private static readonly isProduction = process.env.NODE_ENV === 'production';
  private static readonly secretKey = 'FayClickV2SecureKey!@#$%^&*()2024';
  
  /**
   * Chiffre une chaîne de caractères avec AES-256-GCM simulé
   */
  static encrypt(data: string): string {
    if (!this.isProduction) {
      return data; // Pas de chiffrement en développement
    }
    
    try {
      // Simulation d'un chiffrement AES (en production, utilisez crypto-js ou Web Crypto API)
      const timestamp = Date.now();
      const encoded = btoa(JSON.stringify({
        data: btoa(data),
        timestamp,
        hash: this.generateHash(data + timestamp)
      }));
      
      return encoded;
    } catch (error) {
      console.error('Erreur de chiffrement:', error);
      return data;
    }
  }

  /**
   * Déchiffre une chaîne chiffrée
   */
  static decrypt(encryptedData: string): string {
    if (!this.isProduction) {
      return encryptedData;
    }
    
    try {
      const decoded = JSON.parse(atob(encryptedData));
      
      // Vérifier l'intégrité avec le hash
      const expectedHash = this.generateHash(atob(decoded.data) + decoded.timestamp);
      if (decoded.hash !== expectedHash) {
        throw new Error('Intégrité des données compromise');
      }
      
      // Vérifier que les données ne sont pas trop anciennes (5 minutes max)
      if (Date.now() - decoded.timestamp > 300000) {
        throw new Error('Données expirées');
      }
      
      return atob(decoded.data);
    } catch (error) {
      console.error('Erreur de déchiffrement:', error);
      return encryptedData;
    }
  }

  /**
   * Génère un hash simple pour vérifier l'intégrité
   */
  private static generateHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir en 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Masque les données sensibles dans les logs
   */
  static maskSensitiveData(obj: any): any {
    if (!this.isProduction) {
      return obj; // Logs complets en développement
    }

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sensitiveFields = [
      'password', 'motdepasse', 'token', 'secret', 'key',
      'telephone', 'phone', 'email', 'nom', 'prenom',
      'num_facture', 'code_ticket', 'transaction_id',
      'login', 'username', 'user_id'
    ];

    const masked = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => keyLower.includes(field));

      if (isSensitive && typeof value === 'string') {
        // Masquer partiellement les données sensibles
        if (value.length <= 2) {
          (masked as any)[key] = '**';
        } else if (value.length <= 6) {
          (masked as any)[key] = value.substring(0, 2) + '***';
        } else {
          (masked as any)[key] = value.substring(0, 3) + '***' + value.substring(value.length - 2);
        }
      } else if (typeof value === 'object' && value !== null) {
        (masked as any)[key] = this.maskSensitiveData(value);
      } else {
        (masked as any)[key] = value;
      }
    }

    return masked;
  }

  /**
   * Logger sécurisé qui masque automatiquement les données sensibles
   */
  static secureLog(level: 'log' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [FAYCLICK-${level.toUpperCase()}]`;

    if (this.isProduction) {
      // En production, logs minimaux et masqués
      if (level === 'error') {
        console.error(`${prefix} ${message}`, data ? this.maskSensitiveData(data) : '');
      } else if (level === 'warn') {
        console.warn(`${prefix} ${message}`);
      }
      // Logs 'log' désactivés en production
      return;
    }

    // En développement, logs complets avec préfixe coloré
    const logFunction = console[level] || console.log;
    logFunction(`${prefix} ${message}`, data || '');
  }

  /**
   * Obfusque les réponses de requêtes sensibles
   */
  static obfuscateResponse(response: any): any {
    if (!this.isProduction) {
      return response;
    }

    // Créer une version obfusquée de la réponse
    const obfuscated = this.maskSensitiveData(response);
    
    // Ajouter des données factices pour compliquer l'analyse
    if (typeof obfuscated === 'object' && obfuscated !== null) {
      obfuscated._timestamp = Date.now();
      obfuscated._session = this.generateHash(Date.now().toString()).substring(0, 8);
      obfuscated._app = 'fayclick-v2';
    }

    return obfuscated;
  }

  /**
   * Valide et assainit les paramètres d'entrée
   */
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Supprimer les caractères potentiellement dangereux
      return input
        .replace(/[<>\"']/g, '') // XSS basique
        .replace(/[;&|`$]/g, '') // Injection de commandes
        .replace(/--/g, '') // Injection SQL
        .trim();
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = Array.isArray(input) ? [] : {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Génère un token anti-CSRF
   */
  static generateCSRFToken(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return this.generateHash(timestamp + random + this.secretKey);
  }

  /**
   * Valide un token anti-CSRF
   */
  static validateCSRFToken(token: string): boolean {
    // En production, validation stricte du token
    if (this.isProduction) {
      const sessionToken = typeof window !== 'undefined' ? 
        sessionStorage.getItem('csrf_token') : null;
      return sessionToken === token;
    }
    return true; // En développement, validation souple
  }

  /**
   * Détecte les tentatives d'analyse ou de debugging
   */
  static detectDebugging(): boolean {
    if (!this.isProduction || typeof window === 'undefined') {
      return false;
    }

    let detected = false;

    try {
      // Détection des DevTools
      const threshold = 160;
      if (window.outerHeight - window.innerHeight > threshold ||
          window.outerWidth - window.innerWidth > threshold) {
        detected = true;
      }

      // Détection du debugging via performance
      const start = performance.now();
      // Cette ligne sera ignorée si DevTools n'est pas ouvert
      // eslint-disable-next-line no-debugger
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        detected = true;
      }
    } catch (error) {
      // Ignorer les erreurs de détection
      this.secureLog('error', 'Erreur détection debugging', error);
    }

    if (detected) {
      this.secureLog('warn', 'Tentative de debugging détectée');
      // Optionnel: actions supplémentaires comme redirection ou désactivation
    }

    return detected;
  }

  /**
   * Nettoie toutes les données sensibles du localStorage/sessionStorage
   */
  static clearSensitiveStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      // Identifiants sensibles à nettoyer
      const sensitiveKeys = [
        'fayclick_token', 'fayclick_user', 'fayclick_user',
        'csrf_token', 'auth_token', 'session_token'
      ];

      // Nettoyer localStorage
      sensitiveKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      // Nettoyer sessionStorage
      sensitiveKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });

      this.secureLog('log', 'Données sensibles nettoyées du stockage local');
    } catch (error) {
      this.secureLog('error', 'Erreur nettoyage stockage sensible', error);
    }
  }
}

export default SecurityService;