/**
 * Page publique du catalogue de produits
 * Route : /catalogue?id=183  (par ID structure - recommandé)
 *         /catalogue?structure=SYLVIACOM  (par nom - legacy)
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import CataloguePublicClient from '@/components/catalogue/CataloguePublicClient';

function CatalogueContent() {
  const searchParams = useSearchParams();
  const idStructure = searchParams.get('id');
  const nomStructure = searchParams.get('structure');

  // Priorité à l'ID, sinon fallback sur le nom (legacy)
  if (idStructure) {
    const id = parseInt(idStructure, 10);
    if (isNaN(id) || id <= 0) {
      notFound();
    }
    return <CataloguePublicClient idStructure={id} />;
  }

  if (nomStructure && nomStructure.length >= 2) {
    if (!/^[A-Z0-9_ ]+$/i.test(nomStructure)) {
      notFound();
    }
    return <CataloguePublicClient nomStructure={nomStructure} />;
  }

  notFound();
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
