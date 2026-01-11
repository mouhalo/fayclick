'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import PasswordChangeNotification from '@/components/auth/PasswordChangeNotification';

interface ConditionalAuthProviderProps {
  children: React.ReactNode;
}

/**
 * Wrapper qui applique l'AuthProvider seulement aux pages qui en ont besoin
 * Exclut les pages publiques comme /facture pour éviter les tentatives
 * d'accès au localStorage pour des utilisateurs non authentifiés
 *
 * Inclut aussi PasswordChangeNotification uniquement sur les pages authentifiées
 */
export default function ConditionalAuthProvider({ children }: ConditionalAuthProviderProps) {
  const pathname = usePathname();

  // Pages publiques qui n'ont pas besoin d'authentification
  const publicPages = [
    '/facture',
    '/catalogue',
    '/catalogues',
    '/fay', // Si on utilise aussi ce pattern
  ];

  // Vérifier si la page actuelle est publique
  const isPublicPage = publicPages.some(publicPath =>
    pathname.startsWith(publicPath)
  );

  // Si c'est une page publique, pas d'AuthProvider ni de PasswordChangeNotification
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Pour toutes les autres pages, utiliser l'AuthProvider + PasswordChangeNotification
  return (
    <AuthProvider>
      {children}
      <PasswordChangeNotification />
    </AuthProvider>
  );
}