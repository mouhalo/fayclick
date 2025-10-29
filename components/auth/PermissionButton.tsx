/**
 * Bouton avec Gestion de Permissions
 * Affiche un tooltip si l'utilisateur n'a pas les droits requis
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';

interface PermissionButtonProps {
  /** ID du profil requis (ex: 1 pour ADMIN) - undefined = accessible à tous */
  requiredProfileId?: number;

  /** Fonction appelée au clic (si permission accordée) */
  onClick: () => void;

  /** Contenu du bouton */
  children: React.ReactNode;

  /** Classes CSS personnalisées */
  className?: string;

  /** Désactiver le bouton manuellement */
  disabled?: boolean;

  /** Message du tooltip si permission refusée */
  tooltip?: string;

  /** Type de bouton HTML */
  type?: 'button' | 'submit' | 'reset';
}

export function PermissionButton({
  requiredProfileId,
  onClick,
  children,
  className,
  disabled = false,
  tooltip = "Réservé à l'Administrateur",
  type = 'button'
}: PermissionButtonProps) {
  const { profileId } = useUserProfile();
  const [showTooltip, setShowTooltip] = useState(false);

  // Vérifier si l'utilisateur a la permission
  const hasPermission = !requiredProfileId || profileId === requiredProfileId;
  const isDisabled = disabled || !hasPermission;

  const handleClick = () => {
    // Si pas la permission, afficher tooltip temporaire
    if (!hasPermission) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }

    // Permission OK : exécuter l'action
    onClick();
  };

  return (
    <div className="relative inline-block">
      <button
        type={type}
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          className,
          !hasPermission && "opacity-60 cursor-not-allowed"
        )}
      >
        {children}
      </button>

      {/* Tooltip d'avertissement */}
      <AnimatePresence>
        {showTooltip && !hasPermission && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
          >
            <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl flex items-center gap-2">
              <Lock className="w-3 h-3" />
              {tooltip}
            </div>
            {/* Flèche */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
              <div className="w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
