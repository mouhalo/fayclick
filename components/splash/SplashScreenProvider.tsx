'use client';

import { ReactNode } from 'react';
import SplashScreen from './SplashScreen';
import { useSplashScreen } from '@/hooks/useSplashScreen';

interface SplashScreenProviderProps {
  children: ReactNode;
}

export default function SplashScreenProvider({ children }: SplashScreenProviderProps) {
  const { isVisible, onAnimationComplete } = useSplashScreen({
    minDuration: 4000, // 4 secondes minimum pour bien voir les animations
    storageKey: null, // Désactivé temporairement pour les tests (toujours afficher)
    cacheValidity: 24 * 60 * 60 * 1000, // 24 heures
  });

  return (
    <>
      {/* Splash Screen au premier plan */}
      <SplashScreen
        isVisible={isVisible}
        onAnimationComplete={onAnimationComplete}
      />

      {/* Contenu de l'app - toujours rendu mais avec opacité contrôlée */}
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
