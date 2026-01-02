'use client';

import { useEffect, useState, useCallback } from 'react';

interface PendingRequest {
  type: 'facture' | 'paiement' | 'client' | 'produit';
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body: unknown;
}

interface SyncStatus {
  pending: number;
  lastSync: Date | null;
  isOnline: boolean;
  isSyncing: boolean;
}

interface BackgroundSyncHook {
  status: SyncStatus;
  saveForSync: (request: PendingRequest) => Promise<void>;
  triggerSync: () => Promise<void>;
  isSupported: boolean;
}

/**
 * Hook pour gérer le Background Sync avec le Service Worker
 * Permet de sauvegarder des requêtes pour synchronisation ultérieure
 * et de déclencher la synchronisation manuellement
 */
export function useBackgroundSync(): BackgroundSyncHook {
  const [status, setStatus] = useState<SyncStatus>({
    pending: 0,
    lastSync: null,
    isOnline: true,
    isSyncing: false,
  });

  const [isSupported, setIsSupported] = useState(false);

  // Vérifier le support du Background Sync
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        setIsSupported('sync' in registration);
      });
    }
  }, []);

  // Écouter l'état de connexion
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => {
      setStatus(prev => ({ ...prev, isOnline: navigator.onLine }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // État initial
    setStatus(prev => ({ ...prev, isOnline: navigator.onLine }));

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Écouter les messages du Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const { data } = event;

      if (data.type === 'SYNC_SUCCESS') {
        console.log(`[Background Sync] ${data.requestType} synchronisé:`, data.requestId);
        setStatus(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          lastSync: new Date(),
        }));
      }

      if (data.type === 'SYNC_COMPLETE') {
        console.log(`[Background Sync] Sync terminé: ${data.success}/${data.total}`);
        setStatus(prev => ({
          ...prev,
          pending: data.failed,
          lastSync: new Date(),
          isSyncing: false,
        }));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Sauvegarder une requête pour synchronisation ultérieure
  const saveForSync = useCallback(async (request: PendingRequest): Promise<void> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('[Background Sync] Service Worker non disponible');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sw = registration.active;

      if (!sw) {
        console.warn('[Background Sync] Pas de Service Worker actif');
        return;
      }

      // Envoyer la requête au Service Worker
      sw.postMessage({
        type: 'SAVE_PENDING_REQUEST',
        request: {
          type: request.type,
          url: request.url,
          method: request.method,
          headers: request.headers,
          body: request.body,
        },
      });

      setStatus(prev => ({ ...prev, pending: prev.pending + 1 }));
      console.log('[Background Sync] Requête sauvegardée:', request.type);

    } catch (error) {
      console.error('[Background Sync] Erreur sauvegarde:', error);
      throw error;
    }
  }, []);

  // Déclencher la synchronisation manuellement
  const triggerSync = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('[Background Sync] Service Worker non disponible');
      return;
    }

    if (!navigator.onLine) {
      console.warn('[Background Sync] Pas de connexion réseau');
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isSyncing: true }));

      const registration = await navigator.serviceWorker.ready;

      if ('sync' in registration) {
        await (registration as any).sync.register('sync-all');
        console.log('[Background Sync] Synchronisation déclenchée');
      } else {
        // Fallback: envoyer un message au SW pour sync manuel
        const sw = registration.active;
        if (sw) {
          sw.postMessage({ type: 'TRIGGER_SYNC' });
        }
        setStatus(prev => ({ ...prev, isSyncing: false }));
      }
    } catch (error) {
      console.error('[Background Sync] Erreur déclenchement sync:', error);
      setStatus(prev => ({ ...prev, isSyncing: false }));
      throw error;
    }
  }, []);

  return {
    status,
    saveForSync,
    triggerSync,
    isSupported,
  };
}

/**
 * Helper pour créer une requête de facture offline
 */
export function createFactureRequest(
  apiUrl: string,
  factureData: unknown
): PendingRequest {
  return {
    type: 'facture',
    url: apiUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: factureData,
  };
}

/**
 * Helper pour créer une requête de paiement offline
 */
export function createPaiementRequest(
  apiUrl: string,
  paiementData: unknown
): PendingRequest {
  return {
    type: 'paiement',
    url: apiUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: paiementData,
  };
}
