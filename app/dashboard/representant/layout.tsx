/**
 * Layout dédié à l'espace REPRESENTANT
 *
 * Garde l'accès à `/dashboard/representant/*` uniquement aux utilisateurs
 * dont le profil est REPRESENTANT. Tout autre profil est redirigé vers
 * `/dashboard` (qui le dispatche selon son propre type_structure).
 *
 * UI épurée mobile-first — sidebar/header dédiés gérés dans page.tsx.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authService } from '@/services/auth.service';

export default function RepresentantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = authService.getUser();
    if (!user || user.nom_profil !== 'REPRESENTANT') {
      router.push('/dashboard');
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-fuchsia-50 to-purple-50">
        <Loader2 className="w-10 h-10 text-fuchsia-500 animate-spin mb-3" />
        <p className="text-sm text-gray-500">Chargement de votre espace…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-fuchsia-50/30 to-purple-50/40">
      {children}
    </div>
  );
}
