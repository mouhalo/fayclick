'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';

export default function ImmobilierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Vérifier l'authentification et le type de structure
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = authService.getUser();
    if (!user || user.type_structure !== 'IMMOBILIER') {
      // Rediriger vers le bon dashboard selon le type
      router.push('/dashboard');
    }
  }, [router]);

  return <>{children}</>;
}
