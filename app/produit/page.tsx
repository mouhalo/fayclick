'use client';

import { useEffect, useState, Suspense } from 'react';
import ProduitPublicClient from '@/components/produit/ProduitPublicClient';

function ProduitContent() {
  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token'));
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-sky-100 flex items-center justify-center">
        <div className="text-sky-600 font-medium">Chargement...</div>
      </div>
    );
  }

  if (!token || token.length < 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 font-semibold text-lg">Lien produit invalide</p>
          <p className="text-red-400 text-sm mt-2">Ce lien ne fonctionne pas ou a expiré.</p>
        </div>
      </div>
    );
  }

  return <ProduitPublicClient token={token} />;
}

export default function ProduitPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-sky-100 flex items-center justify-center">
        <div className="text-sky-600 font-medium">Chargement...</div>
      </div>
    }>
      <ProduitContent />
    </Suspense>
  );
}
