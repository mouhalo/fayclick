'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { authService } from '@/services/auth.service';
import { getUserRedirectRoute } from '@/types/auth';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Vérifier l'authentification
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Récupérer l'utilisateur et rediriger vers le bon dashboard
    const user = authService.getUser();
    if (user) {
      const redirectRoute = getUserRedirectRoute(user);
      router.push(redirectRoute);
    } else {
      router.push('/login');
    }
  }, [router]);

  // Page de chargement temporaire
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-400 to-sky-200">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 relative">
          <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-30"></div>
          <div className="relative w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <span className="text-2xl font-black text-white">FC</span>
          </div>
        </div>
        <p className="text-white text-lg font-medium animate-pulse">Redirection en cours...</p>
      </div>
    </div>
  );
}
