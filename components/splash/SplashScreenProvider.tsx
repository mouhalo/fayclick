'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import SplashScreen from './SplashScreen';
import { useSplashScreen } from '@/hooks/useSplashScreen';

interface SplashScreenProviderProps {
  children: ReactNode;
}

// Routes sur lesquelles le splash s'affiche
const SPLASH_ROUTES = ['/'];

export default function SplashScreenProvider({ children }: SplashScreenProviderProps) {
  const pathname = usePathname();
  const showSplash = SPLASH_ROUTES.includes(pathname);

  const { isVisible, onAnimationComplete } = useSplashScreen({
    minDuration: showSplash ? 4000 : 0,
    // Storytelling complet 1× par session (ensuite la page s'affiche directement)
    storageKey: 'fc-splash-session',
    storage: 'session',
    cacheValidity: 8 * 60 * 60 * 1000,
  });

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      <SplashScreen
        isVisible={isVisible}
        onAnimationComplete={onAnimationComplete}
        progressDurationMs={showSplash ? 4000 : 0}
      />
      <div
        className="transition-opacity duration-500"
        style={{
          opacity: isVisible ? 0 : 1,
          pointerEvents: isVisible ? 'none' : 'auto'
        }}
      >
        {children}
      </div>
    </>
  );
}
