/**
 * SubscriptionGuard - Composant pour bloquer l'accès aux fonctionnalités si abonnement expiré
 *
 * Utilisation:
 * <SubscriptionGuard
 *   feature="VENTE_PRODUITS"
 *   fallback={<AbonnementExpireMessage />}
 * >
 *   <VotreComposant />
 * </SubscriptionGuard>
 */

'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Crown,
  Lock,
  ArrowRight,
  RefreshCcw
} from 'lucide-react';
import { useSubscriptionStatus } from '@/contexts/AuthContext';

interface SubscriptionGuardProps {
  children: ReactNode;
  /** Nom de la fonctionnalité (pour logging et messages personnalisés) */
  feature?: string;
  /** Composant alternatif à afficher si abonnement expiré */
  fallback?: ReactNode;
  /** Afficher un message inline au lieu de bloquer complètement */
  mode?: 'block' | 'inline' | 'overlay';
  /** Callback quand l'accès est bloqué */
  onBlocked?: () => void;
}

/**
 * Message par défaut affiché quand l'abonnement est expiré
 */
function DefaultExpiredMessage({ feature, onRenew }: { feature?: string; onRenew: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border-2 border-red-200 shadow-lg"
    >
      <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
        <Lock className="w-8 h-8 text-white" />
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-2">
        Abonnement expiré
      </h3>

      <p className="text-gray-600 text-center mb-6 max-w-md">
        {feature
          ? `La fonctionnalité "${feature}" nécessite un abonnement actif.`
          : 'Cette fonctionnalité nécessite un abonnement actif.'
        }
        <br />
        <span className="text-sm">
          Renouvelez votre abonnement pour continuer à utiliser FayClick.
        </span>
      </p>

      <button
        onClick={onRenew}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-sky-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
      >
        <Crown className="w-5 h-5" />
        Renouveler mon abonnement
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

/**
 * Overlay semi-transparent avec message
 */
function ExpiredOverlay({ feature, onRenew, children }: {
  feature?: string;
  onRenew: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      {/* Contenu flouté */}
      <div className="filter blur-sm pointer-events-none opacity-50">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-6"
        >
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-red-600" />
          </div>
          <h4 className="font-bold text-gray-900 mb-1">Accès restreint</h4>
          <p className="text-sm text-gray-600 mb-4">
            Abonnement expiré
          </p>
          <button
            onClick={onRenew}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            Renouveler
          </button>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Message inline compact
 */
function InlineExpiredMessage({ onRenew }: { onRenew: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
    >
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">
          Abonnement expiré
        </p>
        <p className="text-xs text-red-600">
          Renouvelez pour accéder à cette fonctionnalité
        </p>
      </div>
      <button
        onClick={onRenew}
        className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors flex items-center gap-1"
      >
        <RefreshCcw className="w-3 h-3" />
        Renouveler
      </button>
    </motion.div>
  );
}

/**
 * Composant principal SubscriptionGuard
 */
export default function SubscriptionGuard({
  children,
  feature,
  fallback,
  mode = 'block',
  onBlocked
}: SubscriptionGuardProps) {
  const router = useRouter();
  const { isActive, isReady, canAccessFeature } = useSubscriptionStatus();

  // Rediriger vers la page de renouvellement
  const handleRenew = () => {
    router.push('/settings?tab=subscription');
  };

  // Si pas encore prêt, afficher le contenu (évite le flash)
  if (!isReady) {
    return <>{children}</>;
  }

  // Si abonnement actif, afficher le contenu
  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }

  // Abonnement expiré - notifier si callback fourni
  if (onBlocked) {
    onBlocked();
  }

  // Mode overlay : affiche le contenu avec un overlay
  if (mode === 'overlay') {
    return (
      <ExpiredOverlay feature={feature} onRenew={handleRenew}>
        {children}
      </ExpiredOverlay>
    );
  }

  // Mode inline : affiche un message compact
  if (mode === 'inline') {
    return <InlineExpiredMessage onRenew={handleRenew} />;
  }

  // Mode block (par défaut) : affiche le fallback ou le message par défaut
  if (fallback) {
    return <>{fallback}</>;
  }

  return <DefaultExpiredMessage feature={feature} onRenew={handleRenew} />;
}

/**
 * Hook pour vérifier l'abonnement avant une action
 * @example
 * const { checkSubscription } = useSubscriptionCheck();
 *
 * const handleVente = () => {
 *   if (!checkSubscription('Vente de produits')) return;
 *   // Continuer avec la vente...
 * };
 */
export function useSubscriptionCheck() {
  const router = useRouter();
  const { isActive, getSubscriptionMessage } = useSubscriptionStatus();

  const checkSubscription = (featureName?: string): boolean => {
    if (isActive) return true;

    // Afficher un message et rediriger
    const message = getSubscriptionMessage();
    if (message) {
      console.warn(`⚠️ [SUBSCRIPTION] Accès bloqué: ${featureName || 'fonctionnalité'}`, message);
    }

    return false;
  };

  const redirectToRenew = () => {
    router.push('/settings?tab=subscription');
  };

  return {
    checkSubscription,
    redirectToRenew,
    isActive
  };
}
