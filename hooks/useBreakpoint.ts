'use client';

import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'mobile-large' | 'tablet' | 'desktop' | 'desktop-large';

export interface BreakpointState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isMobileLarge: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isDesktopLarge: boolean;
  width: number;
}

/**
 * Hook pour détecter les breakpoints responsive en JavaScript
 * Basé sur les patterns du guide eTicket PWA
 */
export const useBreakpoint = (): BreakpointState => {
  const [state, setState] = useState<BreakpointState>({
    breakpoint: 'mobile',
    isMobile: true,
    isMobileLarge: false,
    isTablet: false,
    isDesktop: false,
    isDesktopLarge: false,
    width: 0,
  });

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      let breakpoint: Breakpoint = 'mobile';

      if (width >= 1280) {
        breakpoint = 'desktop-large';
      } else if (width >= 1024) {
        breakpoint = 'desktop';
      } else if (width >= 768) {
        breakpoint = 'tablet';
      } else if (width >= 480) {
        breakpoint = 'mobile-large';
      } else {
        breakpoint = 'mobile';
      }

      // Only update state if breakpoint actually changed (plus optimisé)
      setState(prevState => {
        // Éviter les re-renders si le breakpoint et la largeur n'ont pas significativement changé
        if (prevState.breakpoint === breakpoint && Math.abs(prevState.width - width) < 100) {
          return prevState;
        }

        return {
          breakpoint,
          isMobile: breakpoint === 'mobile',
          isMobileLarge: breakpoint === 'mobile-large',
          isTablet: breakpoint === 'tablet',
          isDesktop: breakpoint === 'desktop',
          isDesktopLarge: breakpoint === 'desktop-large',
          width,
        };
      });
    };

    // Initial check avec un petit délai pour éviter les calculs prématurés
    const initialTimeout = setTimeout(updateBreakpoint, 10);

    // Throttled resize handler avec debounce plus long
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBreakpoint, 200); // Augmenté de 100 à 200ms
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
      clearTimeout(initialTimeout);
    };
  }, []);

  return state;
};

/**
 * Hook simplifié pour détecter si on est sur mobile
 */
export const useIsMobile = (): boolean => {
  const { isMobile, isMobileLarge } = useBreakpoint();
  return isMobile || isMobileLarge;
};

/**
 * Hook pour détecter si on est sur desktop avec hover
 */
export const useHasHover = (): boolean => {
  const [hasHover, setHasHover] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    setHasHover(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setHasHover(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return hasHover;
};