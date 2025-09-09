'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// Types pour les modes de navigation
export type NavigationMode = 'top' | 'floating' | 'bottom';

// Interface pour les dimensions et positions
interface ScrollMetrics {
  scrollY: number;
  viewportHeight: number;
  documentHeight: number;
  contentBottom: number;
  scrollProgress: number;
}

// Interface pour les options du hook
interface UseScrollNavigationOptions {
  debounceMs?: number;
  floatingOffset?: number;
  topThreshold?: number;
  bottomThreshold?: number;
  contentSelector?: string;
}

// Interface pour le retour du hook
interface UseScrollNavigationReturn {
  mode: NavigationMode;
  position: {
    bottom?: number;
    top?: number;
  };
  isVisible: boolean;
  scrollProgress: number;
  metrics: ScrollMetrics;
}

/**
 * Hook personnalisé pour gérer la navigation adaptative qui suit le scroll
 * Calcule intelligemment la position optimale des boutons de navigation
 */
export function useScrollNavigation(options: UseScrollNavigationOptions = {}): UseScrollNavigationReturn {
  const {
    debounceMs = 16, // ~60fps
    floatingOffset = 80,
    topThreshold = 0.1,
    bottomThreshold = 120,
    contentSelector = 'main'
  } = options;

  // États pour les métriques de scroll
  const [scrollMetrics, setScrollMetrics] = useState<ScrollMetrics>({
    scrollY: 0,
    viewportHeight: 0,
    documentHeight: 0,
    contentBottom: 0,
    scrollProgress: 0
  });

  const [isVisible, setIsVisible] = useState(true);

  // Fonction pour calculer les métriques de scroll
  const calculateMetrics = useCallback((): ScrollMetrics => {
    if (typeof window === 'undefined') {
      return {
        scrollY: 0,
        viewportHeight: 0,
        documentHeight: 0,
        contentBottom: 0,
        scrollProgress: 0
      };
    }

    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Trouver le contenu principal pour calculer sa position
    const contentElement = document.querySelector(contentSelector) || document.body;
    const contentRect = contentElement.getBoundingClientRect();
    const contentBottom = contentRect.bottom;

    const scrollableHeight = documentHeight - viewportHeight;
    const scrollProgress = scrollableHeight > 0 ? scrollY / scrollableHeight : 0;

    return {
      scrollY,
      viewportHeight,
      documentHeight,
      contentBottom,
      scrollProgress
    };
  }, [contentSelector]);

  // Fonction pour déterminer le mode de navigation optimal
  const determineNavigationMode = useCallback((metrics: ScrollMetrics): NavigationMode => {
    const { scrollProgress, contentBottom } = metrics;

    // Mode "top" : Si on est proche du début de la page
    if (scrollProgress < topThreshold) {
      return 'top';
    }

    // Mode "bottom" : Si le contenu va être masqué par les boutons
    if (contentBottom <= bottomThreshold) {
      return 'bottom';
    }

    // Mode "floating" : Position flottante pendant le scroll
    return 'floating';
  }, [topThreshold, bottomThreshold]);

  // Fonction pour calculer la position des boutons
  const calculatePosition = useCallback((mode: NavigationMode, metrics: ScrollMetrics) => {
    switch (mode) {
      case 'top':
        return { top: 20 };
      
      case 'floating':
        return { bottom: floatingOffset };
      
      case 'bottom':
        const dynamicOffset = Math.max(floatingOffset, metrics.viewportHeight - metrics.contentBottom + 20);
        return { bottom: dynamicOffset };
      
      default:
        return { bottom: floatingOffset };
    }
  }, [floatingOffset]);

  // Handler pour les événements de scroll avec debounce
  const handleScroll = useCallback(() => {
    const newMetrics = calculateMetrics();
    setScrollMetrics(newMetrics);
    
    // Masquer temporairement pendant le scroll rapide (optionnel)
    setIsVisible(true);
  }, [calculateMetrics]);

  // Debounce du scroll pour optimiser les performances
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedScrollHandler = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, debounceMs);
    };

    // Calcul initial
    handleScroll();

    // Événements
    window.addEventListener('scroll', debouncedScrollHandler, { passive: true });
    window.addEventListener('resize', debouncedScrollHandler, { passive: true });

    return () => {
      window.removeEventListener('scroll', debouncedScrollHandler);
      window.removeEventListener('resize', debouncedScrollHandler);
      clearTimeout(timeoutId);
    };
  }, [handleScroll, debounceMs]);

  // Calculs memoizés pour éviter les re-renders inutiles
  const navigationMode = useMemo(() => 
    determineNavigationMode(scrollMetrics), 
    [determineNavigationMode, scrollMetrics]
  );

  const position = useMemo(() => 
    calculatePosition(navigationMode, scrollMetrics), 
    [calculatePosition, navigationMode, scrollMetrics]
  );

  return {
    mode: navigationMode,
    position,
    isVisible,
    scrollProgress: scrollMetrics.scrollProgress,
    metrics: scrollMetrics
  };
}

// Hook simplifié pour les cas d'usage basiques
export function useSimpleScrollNavigation() {
  return useScrollNavigation({
    debounceMs: 16,
    floatingOffset: 80,
    topThreshold: 0.05,
    bottomThreshold: 120
  });
}