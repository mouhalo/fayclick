'use client';

import { useEffect, useState, Suspense } from 'react';
import FacturePubliqueClient from '@/components/facture/FacturePubliqueClient';

function FactureContent() {
  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Extraire le token depuis l'URL côté client
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    setToken(tokenParam);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-blue-600 font-medium">Chargement...</div>
      </div>
    );
  }

  if (!token || token.length < 6) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-red-600 font-medium">Token de facture invalide</div>
      </div>
    );
  }

  return <FacturePubliqueClient token={token} />;
}

export default function FacturePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-blue-600 font-medium">Chargement...</div>
    </div>}>
      <FactureContent />
    </Suspense>
  );
}