import { LoginCredentials, LoginResponse, User } from '@/types/auth';
import DatabaseService from './database.service';
import SecurityService from './security.service';
import { extractSingleDataFromResult } from '@/utils/dataExtractor';
import { type UserCredentialsResult } from '@/types';

// Classe pour gérer les erreurs API
export class ApiException extends Error {
  constructor(public message: string, public status?: number, public details?: unknown) {
    super(message);
    this.name = 'ApiException';
  }
}

// Service d'authentification
export class AuthService {
  private static instance: AuthService;
  
  private constructor() {}
  
  // Singleton pattern
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Méthode de connexion avec fonction PostgreSQL check_user_credentials
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('🔐 [AUTH] Tentative de connexion:', {
        login: credentials.login,
        timestamp: new Date().toISOString()
      });

      // Appel de la fonction PostgreSQL check_user_credentials
      const results = await DatabaseService.checkUserCredentials(credentials.login, credentials.pwd);
      
      console.log('🔍 [AUTH] Résultat vérification identifiants:', {
        hasResults: results && results.length > 0,
        resultCount: results?.length || 0,
        firstResult: results?.[0] ? Object.keys(results[0]) : null
      });
      
      if (results && results.length > 0) {
        // Extraire les données utilisateur directement
        const userData = extractSingleDataFromResult<UserCredentialsResult>(results[0]);
        
        if (userData && userData.actif) {
          // Les données correspondent déjà exactement à l'interface User !
          const user: User = {
            id: userData.id,
            username: userData.username,
            login: userData.login,
            nom: userData.username, // Mapping username -> nom pour compatibilité
            prenom: '', // Pas retourné par la fonction
            email: '', // Pas retourné par la fonction
            nom_groupe: userData.nom_groupe,
            id_structure: userData.id_structure,
            nom_structure: userData.nom_structure,
            pwd_changed: userData.pwd_changed,
            actif: userData.actif,
            type_structure: userData.type_structure,
            logo: userData.logo,
            pwd: '', // Ne jamais exposer le mot de passe
            telephone: userData.telephone,
            nom_profil: userData.nom_profil,
            id_groupe: userData.id_groupe,
            id_profil: userData.id_profil,
            // Propriétés étendues - création d'objets compatibles
            profil: {
              id: userData.id_profil,
              nom: userData.nom_profil,
              id_profil: userData.id_profil,
              nom_profil: userData.nom_profil
            },
            zone: {
              id: 1, // Default - pas retourné par la fonction
              nom: 'Zone par défaut'
            },
            mode: 'standard' // Default - pas retourné par la fonction
          };
          
          const loginResponse: LoginResponse = {
            token: this.generateSessionToken(user),
            user: user
          };
          
          SecurityService.secureLog('log', 'Connexion réussie', {
            userId: user.id,
            userActif: user.actif,
            typeStructure: user.type_structure
          });
          
          return loginResponse;
        } else if (userData && !userData.actif) {
          throw new ApiException('Compte utilisateur désactivé', 401);
        } else {
          throw new ApiException('Identifiants incorrects', 401);
        }
      }
      
      // Aucune réponse valide
      throw new ApiException('Aucun utilisateur trouvé avec ces identifiants', 401);
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur lors de la connexion', {
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      
      if (error instanceof ApiException) {
        throw error;
      }
      
      // Gestion des erreurs réseau
      if (error instanceof Error && error.message.includes('Impossible de contacter')) {
        throw new ApiException('Impossible de contacter le serveur. Vérifiez votre connexion internet.');
      }

      throw new ApiException(
        error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite'
      );
    }
  }
  
  // Génère un token de session basé sur les données utilisateur
  private generateSessionToken(user: User): string {
    if (!user) {
      throw new Error('Utilisateur requis pour générer le token');
    }
    
    const tokenData = {
      userId: user.id,
      login: user.login,
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(2)
    };
    
    // En développement, token simple. En production, utiliser un vrai JWT
    if (process.env.NODE_ENV === 'development') {
      return btoa(JSON.stringify(tokenData));
    }
    
    // En production, on devrait utiliser une vraie signature JWT
    return SecurityService.encrypt(JSON.stringify(tokenData));
  }

  // Sauvegarder le token
  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fayclick_token', token);
      SecurityService.secureLog('log', 'Token de session sauvegardé');
    }
  }

  // Récupérer le token
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fayclick_token');
    }
    return null;
  }

  // Supprimer le token
  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fayclick_token');
      SecurityService.secureLog('log', 'Token de session supprimé');
    }
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    
    if (!token || !user) {
      return false;
    }
    
    // Vérifier que l'utilisateur est actif
    return user.actif === true;
  }
  
  // Méthode pour vérifier la validité du token
  isTokenValid(): boolean {
    try {
      const token = this.getToken();
      if (!token) return false;
      
      // En développement, token simple base64
      if (process.env.NODE_ENV === 'development') {
        const decoded = JSON.parse(atob(token));
        // Vérifier l'âge du token (24h max)
        const tokenAge = Date.now() - decoded.timestamp;
        return tokenAge < (24 * 60 * 60 * 1000);
      }
      
      // En production, décrypter et vérifier
      const decrypted = SecurityService.decrypt(token);
      const decoded = JSON.parse(decrypted);
      const tokenAge = Date.now() - decoded.timestamp;
      return tokenAge < (24 * 60 * 60 * 1000);
      
    } catch (error) {
      SecurityService.secureLog('error', 'Erreur validation token', error);
      return false;
    }
  }

  // Déconnexion avec nettoyage sécurisé
  logout(): void {
    SecurityService.secureLog('log', 'Déconnexion utilisateur');
    
    this.removeToken();
    this.removeUser();
    
    // Nettoyer toutes les données sensibles
    SecurityService.clearSensitiveStorage();
    
    // Rediriger vers la page de connexion
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // Nettoyer toutes les données de session
  clearSession(): void {
    SecurityService.secureLog('log', 'Nettoyage session utilisateur');
    
    this.removeToken();
    this.removeUser();
    
    // Nettoyer toutes les données sensibles
    SecurityService.clearSensitiveStorage();
  }

  // Sauvegarder les données utilisateur (compatible avec l'ancien format fayclick_user)
  saveUser(user: User): void {
    if (typeof window !== 'undefined') {
      const userData = {
        user: user,
        profil: user.profil || null,
        zone: user.zone || null,
        mode: user.mode || null,
        loginTime: new Date().toISOString()
      };
      
      // Sauvegarder les données complètes avec métadonnées
      localStorage.setItem('fayclick_user', JSON.stringify(userData));
      
      SecurityService.secureLog('log', 'Données utilisateur sauvegardées', {
        userId: user.id,
        hasProfile: !!user.profil
      });
    }
  }

  // Récupérer les données utilisateur
  getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('fayclick_user');
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          
          // Gérer le nouveau format avec métadonnées
          if (parsed.user) {
            return parsed.user;
          }
          
          // Gérer l'ancien format direct
          return parsed;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  // Supprimer les données utilisateur
  removeUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fayclick_user');
      localStorage.removeItem('fayclick_user'); // Compatibilité
      SecurityService.secureLog('log', 'Données utilisateur supprimées');
    }
  }
}

// Export instance unique
export const authService = AuthService.getInstance();
