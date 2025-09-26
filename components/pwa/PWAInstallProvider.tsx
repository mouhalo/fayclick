'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { InstallPromptModal } from './InstallPromptModal';

// Pages publiques où on ne propose pas l'installation
const PUBLIC_ROUTES = [
  '/facture',
  '/fay',
  '/login',
  '/register',
  '/inscription-success',
  '/debug-token',
  '/test-facture'
];

export function PWAInstallProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    showInstallPrompt,
    installApp,
    dismissPrompt,
    isInstalled,
    isLoading
  } = useInstallPrompt();

  // Vérifier si on est sur une page publique
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  // Enregistrer le service worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Attendre que la page soit chargée
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('Service Worker enregistré:', registration.scope);

            // Vérifier les mises à jour toutes les heures
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000);

            // Écouter les mises à jour
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Nouveau service worker disponible
                    console.log('Nouvelle version disponible');
                    // TODO: Afficher une notification de mise à jour
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error('Erreur Service Worker:', error);
          });
      });
    }
  }, []);

  // Ajouter un badge d'installation dans le header pour les utilisateurs authentifiés
  useEffect(() => {
    if (!isLoading && !isInstalled && !isPublicRoute) {
      // Créer un petit indicateur discret si l'app n'est pas installée
      const indicator = document.createElement('div');
      indicator.id = 'pwa-install-indicator';
      indicator.className = 'fixed top-4 right-4 z-50';
      indicator.innerHTML = `
        <button
          class="bg-gradient-to-r from-blue-600 to-orange-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          onclick="window.dispatchEvent(new Event('show-install-prompt'))"
        >
          📱 Installer l'app
        </button>
      `;

      // Ajouter uniquement si pas déjà présent et après un délai
      setTimeout(() => {
        if (!document.getElementById('pwa-install-indicator') && !isPublicRoute) {
          document.body.appendChild(indicator);
        }
      }, 5000);

      // Écouter l'événement pour afficher le prompt
      const handleShowPrompt = () => {
        const prompt = document.querySelector('[data-install-prompt]');
        if (prompt) {
          (prompt as any).click();
        }
      };

      window.addEventListener('show-install-prompt', handleShowPrompt);

      return () => {
        const element = document.getElementById('pwa-install-indicator');
        if (element) {
          element.remove();
        }
        window.removeEventListener('show-install-prompt', handleShowPrompt);
      };
    }
  }, [isLoading, isInstalled, isPublicRoute]);

  return (
    <>
      {children}
      {!isPublicRoute && (
        <InstallPromptModal
          isOpen={showInstallPrompt}
          onInstall={installApp}
          onDismiss={dismissPrompt}
        />
      )}
      {/* Bouton caché pour déclencher le prompt manuellement */}
      <button
        data-install-prompt
        className="hidden"
        onClick={() => {
          // Forcer l'affichage du prompt
          if (!showInstallPrompt && !isInstalled) {
            // Simuler l'événement
            window.dispatchEvent(new Event('beforeinstallprompt'));
          }
        }}
      />
    </>
  );
}