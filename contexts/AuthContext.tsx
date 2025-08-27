'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  StructureDetails, 
  UserPermissions, 
  AuthState, 
  LoginCredentials, 
  CompleteAuthData 
} from '@/types/auth';
import { authService, ApiException } from '@/services/auth.service';
import { getUserRedirectRoute } from '@/types/auth';

// Interface pour les méthodes du contexte
interface AuthContextType extends AuthState {
  // Actions d'authentification
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  
  // Actions de mise à jour
  updateUser: (userData: Partial<User>) => void;
  updateStructure: (structureData: Partial<StructureDetails>) => void;
  
  // Utilitaires
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  canAccessRoute: (route: string) => boolean;
}

// Création du contexte
const AuthContext = createContext<AuthContextType | null>(null);

// Props du provider
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider d'authentification complet avec gestion des permissions
 * - Hydration sécurisée depuis localStorage
 * - État réactif global
 * - Synchronisation automatique
 * - Gestion des permissions granulaires
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  
  // État d'authentification
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    structure: null,
    permissions: null,
    isAuthenticated: false,
    isLoading: true,
    isHydrated: false,
    error: null
  });

  // Hydratation depuis localStorage au montage
  useEffect(() => {
    const hydrateFromStorage = async () => {
      try {
        console.log('🔄 [AUTH CONTEXT] Hydratation depuis localStorage...');
        
        // Vérifier si les données complètes existent
        const completeData = authService.getCompleteAuthData();
        
        if (completeData) {
          console.log('✅ [AUTH CONTEXT] Données complètes trouvées:', {
            user: completeData.user.login,
            structure: completeData.structure.nom_structure,
            permissions: completeData.permissions.permissions.length
          });
          
          setAuthState({
            user: completeData.user,
            structure: completeData.structure,
            permissions: completeData.permissions,
            isAuthenticated: true,
            isLoading: false,
            isHydrated: true,
            error: null
          });
        } else {
          // Essayer l'ancien format
          const user = authService.getUser();
          if (user && authService.isTokenValid()) {
            console.log('⚠️ [AUTH CONTEXT] Ancien format trouvé, migration nécessaire');
            
            try {
              // Essayer de récupérer les données manquantes
              const structure = await authService.fetchStructureDetails(user.id_structure);
              const permissions = authService.getUserPermissions(user, structure);
              
              // Sauvegarder le nouveau format
              const completeData: CompleteAuthData = {
                user,
                structure,
                permissions,
                token: authService.getToken() || ''
              };
              
              authService.saveCompleteAuthData(completeData);
              
              setAuthState({
                user,
                structure,
                permissions,
                isAuthenticated: true,
                isLoading: false,
                isHydrated: true,
                error: null
              });
              
              console.log('✅ [AUTH CONTEXT] Migration vers nouveau format réussie');
              
            } catch (error) {
              console.warn('⚠️ [AUTH CONTEXT] Échec migration, déconnexion');
              authService.clearSession();
              setAuthState(prev => ({
                ...prev,
                isLoading: false,
                isHydrated: true,
                error: 'Session expirée'
              }));
            }
          } else {
            console.log('ℹ️ [AUTH CONTEXT] Aucune session valide trouvée');
            setAuthState(prev => ({
              ...prev,
              isLoading: false,
              isHydrated: true
            }));
          }
        }
        
      } catch (error) {
        console.error('❌ [AUTH CONTEXT] Erreur hydratation:', error);
        authService.clearSession();
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          isHydrated: true,
          error: 'Erreur lors du chargement de la session'
        }));
      }
    };

    // Délai pour éviter les erreurs SSR
    const timer = setTimeout(hydrateFromStorage, 100);
    return () => clearTimeout(timer);
  }, []);

  // Fonction de connexion
  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🔐 [AUTH CONTEXT] Connexion en cours...');
      
      // Connexion complète avec structure et permissions
      const completeData = await authService.completeLogin(credentials);
      
      // Sauvegarder toutes les données
      authService.saveCompleteAuthData(completeData);
      
      // Mettre à jour l'état
      setAuthState({
        user: completeData.user,
        structure: completeData.structure,
        permissions: completeData.permissions,
        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
        error: null
      });

      console.log('✅ [AUTH CONTEXT] Connexion réussie');
      
      // Redirection selon le type de structure
      const redirectRoute = getUserRedirectRoute(completeData.user);
      router.push(redirectRoute);

    } catch (error) {
      console.error('❌ [AUTH CONTEXT] Erreur connexion:', error);
      
      let errorMessage = 'Erreur de connexion';
      if (error instanceof ApiException) {
        errorMessage = error.message;
      }

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  }, [router]);

  // Fonction de déconnexion
  const logout = useCallback(() => {
    console.log('🔓 [AUTH CONTEXT] Déconnexion...');
    
    authService.clearSession();
    
    setAuthState({
      user: null,
      structure: null,
      permissions: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: true,
      error: null
    });

    router.push('/login');
  }, [router]);

  // Rafraîchissement des données d'authentification
  const refreshAuth = useCallback(async () => {
    if (!authState.user) return;

    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Récupérer les données à jour
      const structure = await authService.fetchStructureDetails(authState.user.id_structure);
      const permissions = authService.getUserPermissions(authState.user, structure);
      
      setAuthState(prev => ({
        ...prev,
        structure,
        permissions,
        isLoading: false
      }));

    } catch (error) {
      console.error('❌ [AUTH CONTEXT] Erreur rafraîchissement:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur lors du rafraîchissement'
      }));
    }
  }, [authState.user]);

  // Mise à jour des données utilisateur
  const updateUser = useCallback((userData: Partial<User>) => {
    if (!authState.user) return;

    const updatedUser = { ...authState.user, ...userData };
    authService.saveUser(updatedUser);

    setAuthState(prev => ({
      ...prev,
      user: updatedUser
    }));
  }, [authState.user]);

  // Mise à jour des données de structure
  const updateStructure = useCallback((structureData: Partial<StructureDetails>) => {
    if (!authState.structure) return;

    const updatedStructure = { ...authState.structure, ...structureData };
    
    setAuthState(prev => ({
      ...prev,
      structure: updatedStructure
    }));
  }, [authState.structure]);

  // Effacer les erreurs
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // Vérifier une permission
  const hasPermission = useCallback((permission: string) => {
    if (!authState.permissions) return false;
    return authState.permissions.permissions.some(p => p === permission);
  }, [authState.permissions]);

  // Vérifier l'accès à une route
  const canAccessRoute = useCallback((route: string) => {
    if (!authState.permissions) return false;
    
    // Logique simplifiée - peut être étendue
    if (authState.permissions.hasAdminAccess) return true;
    if (route.startsWith('/dashboard') && authState.permissions.canViewDashboard) return true;
    
    return false;
  }, [authState.permissions]);

  // Valeurs du contexte
  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshAuth,
    updateUser,
    updateStructure,
    clearError,
    hasPermission,
    canAccessRoute
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook pour utiliser le contexte d'authentification
 * @returns Contexte d'authentification complet
 * @throws Erreur si utilisé en dehors d'AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook pour vérifier l'authentification (loading safe)
 * @returns État d'authentification sécurisé
 */
export function useAuthState() {
  const { isAuthenticated, isLoading, isHydrated } = useAuth();
  
  return {
    isAuthenticated,
    isLoading,
    isHydrated,
    isReady: isHydrated && !isLoading
  };
}