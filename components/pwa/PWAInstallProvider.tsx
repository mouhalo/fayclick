'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { UpdateToast } from './UpdateToast';

// Pages publiques où on ne propose pas l'installation
const PUBLIC_ROUTES = [
  '/facture',
  '/catalogue',
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
    installApp,
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
                    // Nouveau service worker disponible - UpdateToast gère l'affichage
                    console.log('Nouvelle version disponible');
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
      indicator.className = 'fixed bottom-4 left-4 z-50';
      indicator.innerHTML = `
        <button
          id="pwa-install-badge-btn"
          class="bg-gradient-to-r from-blue-600 to-orange-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
        >
          📱 Installer l'app
        </button>
      `;

      // Ajouter uniquement si pas déjà présent et après un délai
      setTimeout(() => {
        if (!document.getElementById('pwa-install-indicator') && !isPublicRoute) {
          document.body.appendChild(indicator);

          // Ajouter le listener après l'ajout au DOM
          const btn = document.getElementById('pwa-install-badge-btn');
          if (btn) {
            btn.addEventListener('click', () => {
              // Appeler directement installApp via un événement custom
              window.dispatchEvent(new Event('trigger-pwa-install'));
            });
          }
        }
      }, 5000);

      // Écouter l'événement pour déclencher l'installation
      const handleTriggerInstall = () => {
        installApp();
      };

      window.addEventListener('trigger-pwa-install', handleTriggerInstall);

      return () => {
        const element = document.getElementById('pwa-install-indicator');
        if (element) {
          element.remove();
        }
        window.removeEventListener('trigger-pwa-install', handleTriggerInstall);
      };
    }
  }, [isLoading, isInstalled, isPublicRoute, installApp]);

  return (
    <>
      {children}
      {/* Modal d'installation PWA supprimé : mises à jour gérées automatiquement par le Service Worker */}
      <UpdateToast />
    </>
  );
}