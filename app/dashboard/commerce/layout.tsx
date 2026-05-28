'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { DocumentModeProvider } from '@/contexts/DocumentModeContext';

export default function CommerceLayout({
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
    if (!user || user.type_structure !== 'COMMERCIALE') {
      // Rediriger vers le bon dashboard selon le type
      router.push('/dashboard');
    }
  }, [router]);

  // DocumentModeProvider rend `useDocumentMode()` disponible dans toutes
  // les pages commerce (produits, factures, etc.) + composants partages
  // (PanierSidePanel, ModalPanier). Source de verite du mode panier actif.
  return <DocumentModeProvider>{children}</DocumentModeProvider>;
}
