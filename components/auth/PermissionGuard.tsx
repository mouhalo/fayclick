/**
 * Composant de Protection par Permission
 * Masque ou affiche un message selon le profil utilisateur
 */

'use client';

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';

interface PermissionGuardProps {
  /** ID du profil requis (ex: 1 pour ADMIN) */
  requiredProfileId: number;

  /** Contenu à afficher si permission accordée */
  children: React.ReactNode;

  /** Contenu alternatif à afficher si permission refusée */
  fallback?: React.ReactNode;

  /** Afficher le message par défaut si permission refusée (true par défaut) */
  showMessage?: boolean;
}

export function PermissionGuard({
  requiredProfileId,
  children,
  fallback,
  showMessage = true
}: PermissionGuardProps) {
  const { profileId, profileName } = useUserProfile();

  // Vérifier si l'utilisateur a le profil requis
  if (profileId !== requiredProfileId) {
    // Si un fallback custom est fourni
    if (fallback) {
      return <>{fallback}</>;
    }

    // Si on doit afficher le message par défaut
    if (showMessage) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-orange-50 border border-orange-200 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-orange-900 mb-1">
                🔒 Accès Restreint
              </p>
              <p className="text-sm text-orange-800">
                Seul l'Administrateur a accès à cette fonctionnalité.
              </p>
            </div>
          </div>
        </motion.div>
      );
    }

    // Masquer complètement
    return null;
  }

  // Permission accordée : afficher le contenu
  return <>{children}</>;
}
