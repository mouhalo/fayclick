'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  StructureDetails,
  UserPermissions,
  UserRights,
  AuthState,
  LoginCredentials,
  CompleteAuthData
} from '@/types/auth';
import { authService, ApiException } from '@/services/auth.service';
import { getUserRedirectRoute } from '@/types/auth';
import { hasRight, hasAllRights, hasAnyRight } from '@/utils/permissions';
import { EtatAbonnement, SubscriptionStatus } from '@/types/subscription.types';

// Interface pour l'état de l'abonnement
export interface SubscriptionState {
  isActive: boolean;
  status: SubscriptionStatus;
  joursRestants: number;
  dateFin: string | null;
  typeAbonnement: string | null;
}

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

  // 🆕 Gestion des droits PostgreSQL
  hasRight: (functionalityName: string) => boolean;
  hasAllRights: (functionalityNames: string[]) => boolean;
  hasAnyRight: (functionalityNames: string[]) => boolean;

  // 🆕 Gestion de l'état de l'abonnement
  subscriptionState: SubscriptionState;
  isSubscriptionActive: () => boolean;
  isSubscriptionExpiringSoon: () => boolean;
  getSubscriptionDaysRemaining: () => number;
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
    rights: null, // 🆕
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
            permissions: completeData.permissions.permissions.length,
            droits_profil: completeData.rights.profil,
            nb_fonctionnalites: completeData.rights.fonctionnalites.length
          });

          setAuthState({
            user: completeData.user,
            structure: completeData.structure,
            permissions: completeData.permissions,
            rights: completeData.rights, // 🆕
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
              const rights = await authService.fetchUserRights(user.id_structure, user.id_profil); // 🆕

              // Sauvegarder le nouveau format
              const completeData: CompleteAuthData = {
                user,
                structure,
                permissions,
                rights, // 🆕
                token: authService.getToken() || ''
              };

              authService.saveCompleteAuthData(completeData);

              setAuthState({
                user,
                structure,
                permissions,
                rights, // 🆕
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
      
      // Connexion complète avec structure, permissions et droits
      const completeData = await authService.completeLogin(credentials);

      // Sauvegarder toutes les données
      authService.saveCompleteAuthData(completeData);

      // Mettre à jour l'état
      setAuthState({
        user: completeData.user,
        structure: completeData.structure,
        permissions: completeData.permissions,
        rights: completeData.rights, // 🆕
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
      rights: null, // 🆕
      isAuthenticated: false,
      isLoading: false,
      isHydrated: true,
      error: null
    });

    // Solution Senior Developer : Cache busting agressif
    // Couche 1 : Nettoyage complet des données en cache
    if (typeof window !== 'undefined') {
      // Nettoyer tous les storages (sauf cookies essentiels)
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('[AUTH] Erreur nettoyage storage:', e);
      }

      // Couche 2 : Cache busting avec timestamp pour forcer rechargement HTML/JS
      const timestamp = Date.now();
      window.location.href = `/?t=${timestamp}`;
    } else {
      router.push('/');
    }
  }, [router]);

  // Rafraîchissement des données d'authentification
  const refreshAuth = useCallback(async () => {
    if (!authState.user) return;

    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Récupérer les données à jour
      const structure = await authService.fetchStructureDetails(authState.user.id_structure);
      const permissions = authService.getUserPermissions(authState.user, structure);
      const rights = await authService.fetchUserRights(authState.user.id_structure, authState.user.id_profil); // 🆕

      setAuthState(prev => ({
        ...prev,
        structure,
        permissions,
        rights, // 🆕
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

  // 🆕 Vérifier un droit PostgreSQL
  const hasRightCallback = useCallback((functionalityName: string) => {
    return hasRight(authState.rights, functionalityName);
  }, [authState.rights]);

  // 🆕 Vérifier plusieurs droits (ET logique)
  const hasAllRightsCallback = useCallback((functionalityNames: string[]) => {
    return hasAllRights(authState.rights, functionalityNames);
  }, [authState.rights]);

  // 🆕 Vérifier au moins un droit (OU logique)
  const hasAnyRightCallback = useCallback((functionalityNames: string[]) => {
    return hasAnyRight(authState.rights, functionalityNames);
  }, [authState.rights]);

  // 🆕 Calcul de l'état de l'abonnement depuis structure.etat_abonnement
  const subscriptionState: SubscriptionState = useMemo(() => {
    const etatAbonnement = authState.structure?.etat_abonnement;

    if (!etatAbonnement) {
      return {
        isActive: false,
        status: 'EXPIRE' as SubscriptionStatus,
        joursRestants: 0,
        dateFin: null,
        typeAbonnement: null
      };
    }

    return {
      isActive: etatAbonnement.statut === 'ACTIF' && etatAbonnement.jours_restants > 0,
      status: etatAbonnement.statut,
      joursRestants: etatAbonnement.jours_restants,
      dateFin: etatAbonnement.date_fin,
      typeAbonnement: etatAbonnement.type_abonnement
    };
  }, [authState.structure?.etat_abonnement]);

  // 🆕 Vérifier si l'abonnement est actif
  const isSubscriptionActive = useCallback(() => {
    return subscriptionState.isActive;
  }, [subscriptionState.isActive]);

  // 🆕 Vérifier si l'abonnement expire bientôt (dans les 7 jours)
  const isSubscriptionExpiringSoon = useCallback(() => {
    return subscriptionState.isActive && subscriptionState.joursRestants <= 7;
  }, [subscriptionState.isActive, subscriptionState.joursRestants]);

  // 🆕 Obtenir le nombre de jours restants
  const getSubscriptionDaysRemaining = useCallback(() => {
    return subscriptionState.joursRestants;
  }, [subscriptionState.joursRestants]);

  // Log de l'état de l'abonnement pour debug
  useEffect(() => {
    if (authState.isAuthenticated && authState.structure) {
      console.log('📋 [AUTH CONTEXT] État abonnement:', {
        isActive: subscriptionState.isActive,
        status: subscriptionState.status,
        joursRestants: subscriptionState.joursRestants,
        dateFin: subscriptionState.dateFin
      });
    }
  }, [authState.isAuthenticated, authState.structure, subscriptionState]);

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
    canAccessRoute,
    hasRight: hasRightCallback, // 🆕
    hasAllRights: hasAllRightsCallback, // 🆕
    hasAnyRight: hasAnyRightCallback, // 🆕
    // 🆕 État abonnement
    subscriptionState,
    isSubscriptionActive,
    isSubscriptionExpiringSoon,
    getSubscriptionDaysRemaining
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

/**
 * 🆕 Hook pour vérifier l'état de l'abonnement
 * Permet de facilement vérifier si l'abonnement est actif et bloquer des fonctionnalités
 *
 * @example
 * const { isActive, isExpiringSoon, joursRestants, canAccessFeature } = useSubscriptionStatus();
 *
 * if (!canAccessFeature('VENTE')) {
 *   return <AbonnementExpireModal />;
 * }
 */
export function useSubscriptionStatus() {
  const {
    subscriptionState,
    isSubscriptionActive,
    isSubscriptionExpiringSoon,
    getSubscriptionDaysRemaining,
    isAuthenticated,
    isHydrated
  } = useAuth();

  /**
   * Vérifie si l'utilisateur peut accéder à une fonctionnalité
   * Retourne true si abonnement actif, false sinon
   */
  const canAccessFeature = useCallback((featureName?: string) => {
    // Si pas encore hydraté, on autorise temporairement (pour éviter le flash)
    if (!isHydrated) return true;

    // Si pas authentifié, pas d'accès
    if (!isAuthenticated) return false;

    // Vérifier l'abonnement
    return subscriptionState.isActive;
  }, [isHydrated, isAuthenticated, subscriptionState.isActive]);

  /**
   * Message à afficher selon l'état de l'abonnement
   */
  const getSubscriptionMessage = useCallback(() => {
    if (!subscriptionState.isActive) {
      return {
        type: 'error' as const,
        title: 'Abonnement expiré',
        message: 'Votre abonnement a expiré. Veuillez renouveler pour continuer à utiliser cette fonctionnalité.'
      };
    }

    if (subscriptionState.joursRestants <= 3) {
      return {
        type: 'warning' as const,
        title: 'Abonnement bientôt expiré',
        message: `Votre abonnement expire dans ${subscriptionState.joursRestants} jour(s). Pensez à le renouveler.`
      };
    }

    if (subscriptionState.joursRestants <= 7) {
      return {
        type: 'info' as const,
        title: 'Renouvellement recommandé',
        message: `Il vous reste ${subscriptionState.joursRestants} jours d'abonnement.`
      };
    }

    return null;
  }, [subscriptionState]);

  return {
    // État direct
    ...subscriptionState,

    // Méthodes utilitaires
    isActive: subscriptionState.isActive,
    isExpiringSoon: isSubscriptionExpiringSoon(),
    joursRestants: subscriptionState.joursRestants,
    status: subscriptionState.status,

    // Vérification d'accès
    canAccessFeature,
    getSubscriptionMessage,

    // État de chargement
    isReady: isHydrated && isAuthenticated
  };
}