/**
 * Page publique du catalogue de produits
 * Route : /catalogue?structure=SYLVIACOM
 * Inspiré de app/facture/page.tsx (utilise query params au lieu de dynamic routes)
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import CataloguePublicClient from '@/components/catalogue/CataloguePublicClient';

function CatalogueContent() {
  const searchParams = useSearchParams();
  const nomstructure = searchParams.get('structure');

  // Validation du paramètre
  if (!nomstructure || nomstructure.length < 2) {
    notFound();
  }

  // Validation format : alphanumeric + underscore seulement
  if (!/^[A-Z0-9_]+$/i.test(nomstructure)) {
    notFound();
  }

  return <CataloguePublicClient nomStructure={nomstructure} />;
}

export default function CataloguePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex items-center justify-center">
          <div className="text-emerald-600 font-medium">Chargement du catalogue...</div>
        </div>
      }
    >
      <CatalogueContent />
    </Suspense>
  );
}