/**
 * Provider pour gérer les notifications d'expiration d'abonnement
 * À intégrer dans les layouts de dashboard pour vérifier automatiquement
 * l'expiration et envoyer les notifications 7j, 3j, 1j avant
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import subscriptionService from '@/services/subscription.service';
import type { EtatAbonnement } from '@/types/subscription.types';

interface SubscriptionExpirationProviderProps {
  children: React.ReactNode;
}

/**
 * Provider qui vérifie automatiquement l'expiration de l'abonnement
 * et envoie des notifications à 7j, 3j et 1j avant expiration
 */
export function SubscriptionExpirationProvider({
  children
}: SubscriptionExpirationProviderProps) {
  const { user, structure } = useAuth();
  const hasCheckedRef = useRef(false);
  const userIdRef = useRef<number | null>(null);

  /**
   * Vérifie l'expiration et envoie les notifications
   */
  const checkExpiration = useCallback(async () => {
    if (!user?.id_utilisateur) return;

    // Récupérer l'état de l'abonnement depuis la structure
    const etatAbonnement = (structure as any)?.etat_abonnement as EtatAbonnement | undefined;

    if (!etatAbonnement) {
      console.log('📭 [EXPIRATION-PROVIDER] Pas de données d\'abonnement');
      return;
    }

    try {
      console.log('🔔 [EXPIRATION-PROVIDER] Vérification expiration pour user:', user.id_utilisateur);

      // Nettoyer les anciennes clés
      subscriptionService.cleanupOldNotificationKeys(user.id_utilisateur);

      // Vérifier et envoyer les notifications
      const result = await subscriptionService.checkAndNotifyExpiration(
        user.id_utilisateur,
        etatAbonnement
      );

      if (result.notificationsSent.length > 0) {
        console.log('📬 [EXPIRATION-PROVIDER] Notifications envoyées:', result.notificationsSent);
      } else {
        console.log('✅ [EXPIRATION-PROVIDER] Aucune notification nécessaire, jours restants:', result.daysRemaining);
      }

    } catch (error) {
      console.error('❌ [EXPIRATION-PROVIDER] Erreur:', error);
    }
  }, [user, structure]);

  /**
   * Effect pour lancer la vérification au montage
   */
  useEffect(() => {
    // Reset si l'utilisateur change
    if (user?.id_utilisateur !== userIdRef.current) {
      hasCheckedRef.current = false;
      userIdRef.current = user?.id_utilisateur || null;
    }

    // Conditions pour lancer la vérification
    if (!user?.id_utilisateur || hasCheckedRef.current) {
      return;
    }

    // Vérifier que l'état d'abonnement est disponible
    const etatAbonnement = (structure as any)?.etat_abonnement;
    if (!etatAbonnement) {
      return;
    }

    // Marquer comme vérifié
    hasCheckedRef.current = true;

    // Délai pour laisser l'UI se charger
    const timeoutId = setTimeout(() => {
      checkExpiration();
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user, structure, checkExpiration]);

  // Render children sans modification
  return <>{children}</>;
}

export default SubscriptionExpirationProvider;
