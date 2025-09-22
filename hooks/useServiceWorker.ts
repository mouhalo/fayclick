'use client';

import { useEffect, useState } from 'react';

interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdating: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

interface ServiceWorkerUpdate {
  available: boolean;
  version: string;
  forceUpdate: boolean;
}

export function useServiceWorker() {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isSupported: false,
    isRegistered: false,
    isUpdating: false,
    registration: null,
    error: null
  });

  const [updateAvailable, setUpdateAvailable] = useState<ServiceWorkerUpdate>({
    available: false,
    version: '',
    forceUpdate: false
  });

  useEffect(() => {
    // Vérifier si les Service Workers sont supportés
    if (!('serviceWorker' in navigator)) {
      setStatus(prev => ({
        ...prev,
        isSupported: false,
        error: 'Service Workers not supported'
      }));
      return;
    }

    setStatus(prev => ({ ...prev, isSupported: true }));

    // Enregistrer le Service Worker
    registerServiceWorker();

    // Écouter les messages du Service Worker
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      console.log('📦 Registering Service Worker...');

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ Service Worker registered:', registration);

      setStatus(prev => ({
        ...prev,
        isRegistered: true,
        registration
      }));

      // Gérer les mises à jour
      handleServiceWorkerUpdates(registration);

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Registration failed'
      }));
    }
  };

  const handleServiceWorkerUpdates = (registration: ServiceWorkerRegistration) => {
    // Détecter les mises à jour
    registration.addEventListener('updatefound', () => {
      console.log('🔄 Service Worker update found');
      setStatus(prev => ({ ...prev, isUpdating: true }));

      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        console.log('🔄 Service Worker state:', newWorker.state);

        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // Mise à jour disponible
            console.log('🆕 New Service Worker installed, update available');
            setUpdateAvailable({
              available: true,
              version: 'latest',
              forceUpdate: false
            });
          }
          setStatus(prev => ({ ...prev, isUpdating: false }));
        }
      });
    });

    // Écouter les changements de contrôleur
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker controller changed');
      // Le nouveau Service Worker a pris le contrôle
      window.location.reload();
    });
  };

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    console.log('📨 Message from Service Worker:', event.data);

    if (event.data?.type === 'UPDATE_AVAILABLE') {
      setUpdateAvailable({
        available: true,
        version: event.data.version || 'latest',
        forceUpdate: event.data.forceUpdate || false
      });
    }
  };

  // Appliquer la mise à jour du Service Worker
  const applyUpdate = async (): Promise<void> => {
    if (!status.registration) {
      throw new Error('No Service Worker registration available');
    }

    try {
      console.log('⚡ Applying Service Worker update...');

      // Forcer la mise à jour
      await status.registration.update();

      // Si un nouveau worker est en attente, l'activer
      if (status.registration.waiting) {
        status.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Attendre que le nouveau worker prenne le contrôle
      return new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          resolve();
        }, { once: true });

        // Timeout de sécurité
        setTimeout(resolve, 5000);
      });

    } catch (error) {
      console.error('❌ Failed to apply Service Worker update:', error);
      throw error;
    }
  };

  // Vérifier manuellement les mises à jour
  const checkForUpdates = async (): Promise<boolean> => {
    if (!status.registration) {
      return false;
    }

    try {
      console.log('🔍 Checking for Service Worker updates...');
      await status.registration.update();

      // Envoyer un message pour vérifier la version
      if (status.registration.active) {
        const messageChannel = new MessageChannel();

        return new Promise((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            const { isUpdateAvailable } = event.data;
            resolve(isUpdateAvailable);
          };

          status.registration!.active!.postMessage(
            { type: 'GET_VERSION' },
            [messageChannel.port2]
          );

          // Timeout
          setTimeout(() => resolve(false), 3000);
        });
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to check for updates:', error);
      return false;
    }
  };

  // Supprimer le Service Worker
  const unregister = async (): Promise<boolean> => {
    if (!status.registration) {
      return false;
    }

    try {
      const result = await status.registration.unregister();
      console.log('🗑️ Service Worker unregistered:', result);

      setStatus({
        isSupported: true,
        isRegistered: false,
        isUpdating: false,
        registration: null,
        error: null
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to unregister Service Worker:', error);
      return false;
    }
  };

  return {
    status,
    updateAvailable,
    applyUpdate,
    checkForUpdates,
    unregister
  };
}