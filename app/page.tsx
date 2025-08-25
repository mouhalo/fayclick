'use client';

import { useIsDesktop } from '@/hooks';
import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';

// Import dynamique pour optimiser le chargement
const MobileHome = dynamic(() => import('@/components/home/MobileHome'), {
  loading: () => <LoadingScreen />,
  ssr: false // Désactiver le SSR pour éviter les problèmes d'hydratation
});

const DesktopHome = dynamic(() => import('@/components/home/DesktopHome'), {
  loading: () => <LoadingScreen />,
  ssr: false
});

// Écran de chargement
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-200 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 relative">
          <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-30"></div>
          <div className="relative w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <span className="text-2xl font-black text-white">FC</span>
          </div>
        </div>
        <p className="text-white text-lg font-medium animate-pulse">Chargement...</p>
      </div>
    </div>
  );
}

export default function Home() {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  const handleLogout = () => {
    authService.clearSession();
    router.push('/login');
  };

  return (
    <>
      {/* Bouton de déconnexion temporaire pour debug */}
      {isAuthenticated && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all text-sm font-medium"
          >
            Déconnexion
          </button>
        </div>
      )}
      
      <Suspense fallback={<LoadingScreen />}>
        {isDesktop ? <DesktopHome /> : <MobileHome />}
      </Suspense>
    </>
  );
}
