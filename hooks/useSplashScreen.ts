'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseSplashScreenOptions {
  /** Durée minimale d'affichage du splash en ms (default: 3500) */
  minDuration?: number;
  /** Clé localStorage pour ne pas réafficher le splash (default: null = toujours afficher) */
  storageKey?: string | null;
  /** Durée de validité du cache en ms (default: 24h) */
  cacheValidity?: number;
}

interface UseSplashScreenReturn {
  /** Si le splash est visible */
  isVisible: boolean;
  /** Forcer la fin du splash */
  hideSplash: () => void;
  /** Callback à passer à onAnimationComplete */
  onAnimationComplete: () => void;
}

const DEFAULT_MIN_DURATION = 3500; // 3.5 secondes
const DEFAULT_CACHE_VALIDITY = 24 * 60 * 60 * 1000; // 24 heures

export function useSplashScreen(options: UseSplashScreenOptions = {}): UseSplashScreenReturn {
  const {
    minDuration = DEFAULT_MIN_DURATION,
    storageKey = null,
    cacheValidity = DEFAULT_CACHE_VALIDITY,
  } = options;

  // Vérifier le cache côté client uniquement
  const [shouldShow, setShouldShow] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  // Vérification initiale du cache
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Vérifier si on doit afficher le splash (cache localStorage)
    if (storageKey) {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const { timestamp } = JSON.parse(cached);
          const isValid = Date.now() - timestamp < cacheValidity;
          if (isValid) {
            // Ne pas afficher le splash si cache valide
            setShouldShow(false);
            setIsVisible(false);
            return;
          }
        }
      } catch {
        // Ignorer les erreurs de parsing
      }
    }

    // Afficher le splash pendant la durée minimale
    const timer = setTimeout(() => {
      setIsVisible(false);

      // Sauvegarder dans localStorage si storageKey défini
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify({ timestamp: Date.now() }));
        } catch {
          // Ignorer les erreurs de stockage
        }
      }
    }, minDuration);

    return () => clearTimeout(timer);
  }, [storageKey, cacheValidity, minDuration]);

  const hideSplash = useCallback(() => {
    setIsVisible(false);
  }, []);

  const onAnimationComplete = useCallback(() => {
    // Callback optionnel après la fin de l'animation de sortie
  }, []);

  return {
    isVisible: shouldShow && isVisible,
    hideSplash,
    onAnimationComplete,
  };
}

export default useSplashScreen;
