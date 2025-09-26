import { useState, useEffect, useCallback } from 'react';

interface InstallPromptHook {
  isInstallable: boolean;
  isInstalled: boolean;
  showInstallPrompt: boolean;
  installApp: () => Promise<void>;
  dismissPrompt: () => void;
  resetPrompt: () => void;
  shouldShowPrompt: boolean;
  isLoading: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Clés localStorage
const INSTALL_DISMISSED_KEY = 'fayclick_install_dismissed';
const INSTALL_DISMISSED_COUNT_KEY = 'fayclick_install_dismissed_count';
const LAST_PROMPT_DATE_KEY = 'fayclick_last_prompt_date';
const APP_INSTALLED_KEY = 'fayclick_app_installed';

// Configuration
const MAX_DISMISS_COUNT = 3; // Nombre max de fois où on peut fermer avant d'arrêter
const DAYS_BETWEEN_PROMPTS = 7; // Jours entre les prompts après fermeture

export function useInstallPrompt(): InstallPromptHook {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier si l'app est déjà installée
  const checkIfInstalled = useCallback(() => {
    // Vérifier via localStorage
    const localInstalled = localStorage.getItem(APP_INSTALLED_KEY) === 'true';

    // Vérifier si l'app s'exécute en mode standalone (PWA installée)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');

    const installed = localInstalled || isStandalone;
    setIsInstalled(installed);

    if (installed && !localInstalled) {
      // Marquer comme installée dans localStorage
      localStorage.setItem(APP_INSTALLED_KEY, 'true');
    }

    return installed;
  }, []);

  // Vérifier si on doit montrer le prompt
  const shouldShowPrompt = useCallback((): boolean => {
    // Ne pas montrer sur les pages publiques
    const publicPaths = ['/facture', '/fay', '/login', '/register', '/inscription-success'];
    const currentPath = window.location.pathname;
    const isPublicPage = publicPaths.some(path => currentPath.startsWith(path));

    if (isPublicPage) {
      return false;
    }

    // Si l'app est installée, ne pas montrer
    if (checkIfInstalled()) {
      return false;
    }

    // Vérifier le nombre de fois où l'utilisateur a fermé
    const dismissCount = parseInt(localStorage.getItem(INSTALL_DISMISSED_COUNT_KEY) || '0');
    if (dismissCount >= MAX_DISMISS_COUNT) {
      return false;
    }

    // Vérifier la dernière date de prompt
    const lastPromptDate = localStorage.getItem(LAST_PROMPT_DATE_KEY);
    if (lastPromptDate) {
      const daysSinceLastPrompt = (Date.now() - parseInt(lastPromptDate)) / (1000 * 60 * 60 * 24);
      if (daysSinceLastPrompt < DAYS_BETWEEN_PROMPTS) {
        return false;
      }
    }

    // Vérifier si l'utilisateur a déjà fermé aujourd'hui
    const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (dismissed) {
      const dismissedDate = new Date(parseInt(dismissed));
      const today = new Date();
      if (dismissedDate.toDateString() === today.toDateString()) {
        return false;
      }
    }

    return true;
  }, [checkIfInstalled]);

  // Installer l'app
  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('Pas de prompt d\'installation disponible');
      return;
    }

    try {
      // Afficher le prompt natif
      await deferredPrompt.prompt();

      // Attendre le choix de l'utilisateur
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('Installation acceptée');
        localStorage.setItem(APP_INSTALLED_KEY, 'true');
        setIsInstalled(true);
        setShowInstallPrompt(false);

        // Tracker l'installation (analytics)
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'pwa_install', {
            event_category: 'PWA',
            event_label: 'Installation acceptée'
          });
        }
      } else {
        console.log('Installation refusée');
        dismissPrompt();
      }

      // Réinitialiser le prompt
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Erreur lors de l\'installation:', error);
    }
  }, [deferredPrompt]);

  // Fermer le prompt
  const dismissPrompt = useCallback(() => {
    setShowInstallPrompt(false);

    // Enregistrer la fermeture
    localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString());
    localStorage.setItem(LAST_PROMPT_DATE_KEY, Date.now().toString());

    // Incrémenter le compteur de fermetures
    const currentCount = parseInt(localStorage.getItem(INSTALL_DISMISSED_COUNT_KEY) || '0');
    localStorage.setItem(INSTALL_DISMISSED_COUNT_KEY, (currentCount + 1).toString());

    // Tracker la fermeture (analytics)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'pwa_prompt_dismissed', {
        event_category: 'PWA',
        event_label: `Fermeture ${currentCount + 1}`
      });
    }
  }, []);

  // Réinitialiser le prompt (pour tests ou réinitialisation manuelle)
  const resetPrompt = useCallback(() => {
    localStorage.removeItem(INSTALL_DISMISSED_KEY);
    localStorage.removeItem(INSTALL_DISMISSED_COUNT_KEY);
    localStorage.removeItem(LAST_PROMPT_DATE_KEY);
    localStorage.removeItem(APP_INSTALLED_KEY);
    setIsInstalled(false);

    if (deferredPrompt && shouldShowPrompt()) {
      setShowInstallPrompt(true);
    }
  }, [deferredPrompt, shouldShowPrompt]);

  useEffect(() => {
    // Vérifier si déjà installée
    checkIfInstalled();
    setIsLoading(false);

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Empêcher le prompt par défaut
      e.preventDefault();

      // Stocker l'événement
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);

      // Vérifier si on doit montrer notre prompt custom
      if (shouldShowPrompt()) {
        // Attendre un peu avant de montrer (meilleure UX)
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 2000);
      }
    };

    // Écouter l'événement d'installation réussie
    const handleAppInstalled = () => {
      console.log('App installée avec succès');
      localStorage.setItem(APP_INSTALLED_KEY, 'true');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    // Écouter les changements de mode d'affichage
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem(APP_INSTALLED_KEY, 'true');
        setIsInstalled(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, [shouldShowPrompt, checkIfInstalled]);

  return {
    isInstallable,
    isInstalled,
    showInstallPrompt,
    installApp,
    dismissPrompt,
    resetPrompt,
    shouldShowPrompt: shouldShowPrompt(),
    isLoading
  };
}