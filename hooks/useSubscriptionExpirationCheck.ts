/**
 * Hook pour vérifier l'expiration de l'abonnement et envoyer des notifications
 * S'exécute au login/chargement de l'app
 * Envoie des notifications à 7j, 3j et 1j avant expiration
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import subscriptionService, { ExpirationCheckResult } from '@/services/subscription.service';
import type { EtatAbonnement } from '@/types/subscription.types';

interface UseSubscriptionExpirationCheckOptions {
  /** Activer/désactiver la vérification */
  enabled?: boolean;
  /** Callback appelé après vérification */
  onCheckComplete?: (result: ExpirationCheckResult) => void;
  /** Callback appelé si notification envoyée */
  onNotificationSent?: (daysRemaining: number) => void;
}

interface UseSubscriptionExpirationCheckResult {
  /** Vérifie manuellement l'expiration */
  checkExpiration: () => Promise<ExpirationCheckResult | null>;
  /** Indique si une vérification est en cours */
  isChecking: boolean;
  /** Dernier résultat de vérification */
  lastResult: ExpirationCheckResult | null;
}

/**
 * Hook pour gérer les notifications d'expiration d'abonnement
 *
 * @example
 * ```tsx
 * const { checkExpiration, lastResult } = useSubscriptionExpirationCheck({
 *   enabled: true,
 *   onNotificationSent: (days) => console.log(`Notification ${days}j envoyée`)
 * });
 * ```
 */
export function useSubscriptionExpirationCheck(
  options: UseSubscriptionExpirationCheckOptions = {}
): UseSubscriptionExpirationCheckResult {
  const { enabled = true, onCheckComplete, onNotificationSent } = options;
  const { user, structure } = useAuth();

  const isCheckingRef = useRef(false);
  const lastResultRef = useRef<ExpirationCheckResult | null>(null);
  const hasCheckedRef = useRef(false);

  /**
   * Effectue la vérification d'expiration
   */
  const checkExpiration = useCallback(async (): Promise<ExpirationCheckResult | null> => {
    // Éviter les vérifications multiples simultanées
    if (isCheckingRef.current) {
      console.log('🔄 [EXPIRATION-CHECK] Vérification déjà en cours');
      return lastResultRef.current;
    }

    // Vérifier les prérequis
    if (!user?.id_utilisateur) {
      console.log('📭 [EXPIRATION-CHECK] Pas d\'utilisateur connecté');
      return null;
    }

    // Récupérer l'état de l'abonnement depuis la structure
    const etatAbonnement = (structure as any)?.etat_abonnement as EtatAbonnement | undefined;

    if (!etatAbonnement) {
      console.log('📭 [EXPIRATION-CHECK] Pas de données d\'abonnement disponibles');
      return null;
    }

    isCheckingRef.current = true;

    try {
      console.log('🔔 [EXPIRATION-CHECK] Démarrage vérification pour user:', user.id_utilisateur);

      // Nettoyer les anciennes clés de notification
      subscriptionService.cleanupOldNotificationKeys(user.id_utilisateur);

      // Vérifier et envoyer les notifications
      const result = await subscriptionService.checkAndNotifyExpiration(
        user.id_utilisateur,
        etatAbonnement
      );

      lastResultRef.current = result;

      // Callbacks
      if (onCheckComplete) {
        onCheckComplete(result);
      }

      if (result.notificationsSent.length > 0 && onNotificationSent) {
        result.notificationsSent.forEach(days => {
          onNotificationSent(days);
        });
      }

      console.log('✅ [EXPIRATION-CHECK] Vérification terminée:', {
        daysRemaining: result.daysRemaining,
        notificationsSent: result.notificationsSent
      });

      return result;

    } catch (error) {
      console.error('❌ [EXPIRATION-CHECK] Erreur:', error);
      return null;
    } finally {
      isCheckingRef.current = false;
    }
  }, [user, structure, onCheckComplete, onNotificationSent]);

  /**
   * Effect pour lancer la vérification automatique au montage
   */
  useEffect(() => {
    // Conditions pour lancer la vérification
    if (!enabled || !user?.id_utilisateur || hasCheckedRef.current) {
      return;
    }

    // Attendre que la structure soit chargée avec etat_abonnement
    const etatAbonnement = (structure as any)?.etat_abonnement;
    if (!etatAbonnement) {
      return;
    }

    // Marquer comme vérifié pour éviter les doublons
    hasCheckedRef.current = true;

    // Délai court pour laisser l'UI se charger
    const timeoutId = setTimeout(() => {
      checkExpiration();
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [enabled, user, structure, checkExpiration]);

  /**
   * Reset le flag de vérification si l'utilisateur change
   */
  useEffect(() => {
    hasCheckedRef.current = false;
  }, [user?.id_utilisateur]);

  return {
    checkExpiration,
    isChecking: isCheckingRef.current,
    lastResult: lastResultRef.current
  };
}

export default useSubscriptionExpirationCheck;
