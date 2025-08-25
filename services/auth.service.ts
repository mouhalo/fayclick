import { LoginCredentials, LoginResponse, ApiError } from '@/types/auth';

// Configuration de l'API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.icelabsoft.com/api';

// Classe pour gérer les erreurs API
export class ApiException extends Error {
  constructor(public message: string, public status?: number, public details?: any) {
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

  // Méthode de connexion
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/utilisateurs/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      // Log pour debug
      if (process.env.NODE_ENV === 'development') {
        console.log('Login response status:', response.status);
      }

      // Gestion des erreurs HTTP
      if (!response.ok) {
        let errorMessage = 'Erreur de connexion';
        
        switch (response.status) {
          case 401:
            errorMessage = 'Identifiants incorrects';
            break;
          case 404:
            errorMessage = 'Utilisateur non trouvé';
            break;
          case 500:
            errorMessage = 'Erreur serveur. Veuillez réessayer plus tard';
            break;
        }

        // Essayer de récupérer le message d'erreur du serveur
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // Ignorer si pas de JSON
        }

        throw new ApiException(errorMessage, response.status);
      }

      const data: LoginResponse = await response.json();
      
      // Validation de la réponse
      if (!data.token || !data.user) {
        throw new ApiException('Réponse invalide du serveur');
      }

      return data;
    } catch (error) {
      // Gestion des erreurs réseau
      if (error instanceof ApiException) {
        throw error;
      }
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new ApiException('Impossible de contacter le serveur. Vérifiez votre connexion internet.');
      }

      throw new ApiException('Une erreur inattendue s\'est produite');
    }
  }

  // Sauvegarder le token
  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fayclick_token', token);
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
    }
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Déconnexion
  logout(): void {
    this.removeToken();
    this.removeUser();
    // Rediriger vers la page de connexion
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // Nettoyer toutes les données de session
  clearSession(): void {
    this.removeToken();
    this.removeUser();
  }

  // Sauvegarder les données utilisateur
  saveUser(user: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fayclick_user', JSON.stringify(user));
    }
  }

  // Récupérer les données utilisateur
  getUser(): any | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('fayclick_user');
      if (userStr) {
        try {
          return JSON.parse(userStr);
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
    }
  }
}

// Export instance unique
export const authService = AuthService.getInstance();
