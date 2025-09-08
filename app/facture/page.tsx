'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import FacturePubliqueClient from '@/components/facture/FacturePubliqueClient';

function FactureContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token || token.length < 10) {
    notFound();
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