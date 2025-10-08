/**
 * Hook Centralisé pour la Gestion du Profil Utilisateur
 * Fournit un accès unifié au profil, permissions et helpers
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';

export function useUserProfile() {
  const { user } = useAuth();

  // Extraction sécurisée des données de profil
  const profileId = user?.profil?.id_profil;
  const profileName = user?.profil?.profil || user?.nom_profil || '';

  // Vérification ADMIN (id_profil = 1)
  const isAdmin = profileId === 1;

  /**
   * Helper pour vérifier si l'utilisateur a un profil spécifique
   * @param requiredId - ID du profil requis (ex: 1 pour ADMIN)
   * @returns true si l'utilisateur a le profil requis
   */
  const hasProfile = (requiredId: number): boolean => {
    return profileId === requiredId;
  };

  return {
    /** ID du profil utilisateur (ex: 1 = ADMIN, 9 = CAISSIER) */
    profileId,

    /** Nom du profil utilisateur (ex: "ADMIN", "CAISSIER") */
    profileName,

    /** true si l'utilisateur est ADMIN (id_profil = 1) */
    isAdmin,

    /** Utilisateur complet depuis AuthContext */
    user,

    /** Helper pour vérifier un profil spécifique */
    hasProfile,
  };
}
