'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/types/auth';

interface AuthGuardProps {
  children: ReactNode;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  fallbackRoute?: string;
  requireAll?: boolean; // true = toutes les permissions, false = au moins une
  loadingComponent?: ReactNode;
  unauthorizedComponent?: ReactNode;
}

/**
 * Composant de protection des routes avec vérification des permissions
 * Redirige automatiquement si l'utilisateur n'est pas authentifié ou n'a pas les droits
 */
export default function AuthGuard({
  children,
  requiredPermission,
  requiredPermissions = [],
  fallbackRoute = '/login',
  requireAll = false,
  loadingComponent = <AuthGuardLoading />,
  unauthorizedComponent = <AuthGuardUnauthorized />
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isHydrated } = useAuth();
  const { can, canAny, canAll } = usePermissions();

  // Construire la liste des permissions à vérifier
  const permissionsToCheck = [
    ...(requiredPermission ? [requiredPermission] : []),
    ...requiredPermissions
  ];

  // Vérifier l'authentification et les permissions
  useEffect(() => {
    // Attendre que l'hydratation soit terminée
    if (!isHydrated) return;

    // Si pas authentifié, rediriger
    if (!isAuthenticated) {
      console.log('🚫 [AUTH GUARD] Non authentifié, redirection vers', fallbackRoute);
      router.push(fallbackRoute);
      return;
    }

    // Si des permissions sont requises, les vérifier
    if (permissionsToCheck.length > 0) {
      const hasAccess = requireAll 
        ? canAll(permissionsToCheck)
        : canAny(permissionsToCheck);

      if (!hasAccess) {
        console.log('🚫 [AUTH GUARD] Permissions insuffisantes:', {
          required: permissionsToCheck,
          requireAll
        });
        router.push('/dashboard');
        return;
      }
    }

  }, [isAuthenticated, isHydrated, permissionsToCheck, requireAll, router, fallbackRoute, canAny, canAll]);

  // État de chargement
  if (!isHydrated || isLoading) {
    return <>{loadingComponent}</>;
  }

  // Non authentifié
  if (!isAuthenticated) {
    return <>{unauthorizedComponent}</>;
  }

  // Vérification des permissions
  if (permissionsToCheck.length > 0) {
    const hasAccess = requireAll 
      ? canAll(permissionsToCheck)
      : canAny(permissionsToCheck);

    if (!hasAccess) {
      return <>{unauthorizedComponent}</>;
    }
  }

  // Tout est OK, afficher le contenu
  return <>{children}</>;
}

/**
 * Composant de chargement par défaut
 */
function AuthGuardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-30"></div>
          <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-2xl font-black text-white">FC</span>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Vérification de la session...
        </h3>
        <p className="text-gray-600">
          Chargement de vos données
        </p>
        <div className="mt-4 flex justify-center">
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Composant d'accès refusé par défaut
 */
function AuthGuardUnauthorized() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-red-100">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-3xl">🚫</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Accès refusé
        </h3>
        <p className="text-gray-600 mb-6">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retour au dashboard
          </button>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Se reconnecter
          </button>
        </div>
      </div>
    </div>
  );
}