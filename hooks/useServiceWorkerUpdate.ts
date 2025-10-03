'use client';

import { useEffect, useState } from 'react';

export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swVersion, setSwVersion] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Écouter les messages du Service Worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('[SW Update] Nouvelle version détectée:', event.data.version);
        setUpdateAvailable(true);
        setSwVersion(event.data.version);

        // Forcer le rechargement automatique après 1 seconde
        // pour permettre au SW de se stabiliser
        setTimeout(() => {
          console.log('[SW Update] Rechargement de la page...');
          window.location.reload();
        }, 1000);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Vérifier s'il y a déjà un SW en attente
    navigator.serviceWorker.ready.then(registration => {
      if (registration.waiting) {
        console.log('[SW Update] Service Worker en attente détecté');
        // Demander au SW en attente de devenir actif
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Écouter les nouveaux SW en attente
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW Update] Nouvelle version installée');
              // Un nouveau SW est disponible
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return { updateAvailable, swVersion };
}
