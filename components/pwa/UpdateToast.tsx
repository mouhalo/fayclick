'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UpdateToastProps {
  version?: string;
  message?: string;
}

export function UpdateToast({ version, message }: UpdateToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; message: string } | null>(null);

  useEffect(() => {
    // Écouter les messages du Service Worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('[UpdateToast] Nouvelle version détectée:', event.data.version);
        setUpdateInfo({
          version: event.data.version || 'nouvelle',
          message: event.data.message || 'Une nouvelle version est disponible'
        });
        setIsVisible(true);
      }
    };

    // Écouter les messages via navigator.serviceWorker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // Écouter aussi via le contrôleur en attente
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Écouter les mises à jour du SW
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nouveau SW installé, montrer le toast
                console.log('[UpdateToast] Nouveau Service Worker installé');
                setUpdateInfo({
                  version: 'nouvelle',
                  message: 'Une mise à jour est prête à être installée'
                });
                setIsVisible(true);
              }
            });
          }
        });
      });
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  // Si props passées directement (pour tests ou usage manuel)
  useEffect(() => {
    if (version || message) {
      setUpdateInfo({
        version: version || 'nouvelle',
        message: message || 'Une nouvelle version est disponible'
      });
      setIsVisible(true);
    }
  }, [version, message]);

  const handleUpdate = () => {
    // Recharger la page pour appliquer la mise à jour
    window.location.reload();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Stocker en sessionStorage pour ne pas réafficher durant cette session
    sessionStorage.setItem('fayclick_update_dismissed', 'true');
  };

  // Ne pas afficher si déjà fermé durant cette session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('fayclick_update_dismissed');
    if (dismissed === 'true' && isVisible) {
      setIsVisible(false);
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && updateInfo && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999]"
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-2xl overflow-hidden">
            {/* Barre de progression animée */}
            <div className="h-1 bg-blue-400/30">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 30, ease: 'linear' }}
                className="h-full bg-orange-400"
                onAnimationComplete={handleDismiss}
              />
            </div>

            <div className="p-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xl">🔄</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm">
                    Nouvelle version disponible !
                  </h3>
                  <p className="text-blue-100 text-xs mt-0.5">
                    Version {updateInfo.version}
                  </p>
                </div>
                {/* Bouton fermer */}
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  aria-label="Fermer"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Message */}
              <p className="text-blue-100 text-xs mt-2 ml-13">
                {updateInfo.message}
              </p>

              {/* Boutons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleDismiss}
                  className="flex-1 px-4 py-2 text-xs font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  Plus tard
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-4 py-2 text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 rounded-lg transition-colors shadow-lg"
                >
                  Mettre à jour
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
