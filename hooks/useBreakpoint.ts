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

      setState({
        breakpoint,
        isMobile: breakpoint === 'mobile',
        isMobileLarge: breakpoint === 'mobile-large',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop',
        isDesktopLarge: breakpoint === 'desktop-large',
        width,
      });
    };

    // Initial check
    updateBreakpoint();

    // Listen for resize events
    const handleResize = () => {
      updateBreakpoint();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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