'use client';

import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';
import { useEffect } from 'react';

/**
 * Composant qui gère automatiquement les mises à jour du Service Worker
 * Placé dans le layout principal pour être toujours actif
 */
export function ServiceWorkerUpdateHandler() {
  const { updateAvailable, swVersion } = useServiceWorkerUpdate();

  useEffect(() => {
    if (updateAvailable) {
      console.log(`🔄 Mise à jour Service Worker v${swVersion} en cours...`);
    }
  }, [updateAvailable, swVersion]);

  // Ce composant ne rend rien visuellement
  return null;
}
