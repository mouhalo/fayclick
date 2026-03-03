/**
 * Page publique Marketplace FayClick
 * Route : /catalogues
 * Affiche tous les marchands et produits publics
 */

import { Suspense } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketplace FayClick - Tous les marchands et produits',
  description: 'Decouvrez les boutiques et produits de nos marchands sur FayClick. Trouvez un marchand par nom ou telephone en quelques secondes.',
  openGraph: {
    title: 'Marketplace FayClick',
    description: 'Trouvez un marchand par nom ou telephone - Boutiques en ligne au Senegal',
    type: 'website',
  },
};

// Import dynamique pour le composant client
import CataloguesGlobalClient from '@/components/catalogue/CataloguesGlobalClient';

function CataloguesContent() {
  return <CataloguesGlobalClient />;
}

export default function CataloguesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-400/50 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-emerald-200 font-medium text-sm">Chargement de la marketplace...</p>
          </div>
        </div>
      }
    >
      <CataloguesContent />
    </Suspense>
  );
}
