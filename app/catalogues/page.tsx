/**
 * Page publique du catalogue global de tous les produits
 * Route : /catalogues
 * Affiche tous les produits de toutes les structures
 */

'use client';

import { Suspense } from 'react';
import CataloguesGlobalClient from '@/components/catalogue/CataloguesGlobalClient';

function CataloguesContent() {
  return <CataloguesGlobalClient />;
}

export default function CataloguesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex items-center justify-center">
          <div className="text-emerald-600 font-medium">Chargement du catalogue global...</div>
        </div>
      }
    >
      <CataloguesContent />
    </Suspense>
  );
}
