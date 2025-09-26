'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import RecuPubliqueClient from '@/components/recu/RecuPubliqueClient';

function RecuContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token || token.length < 6) {
    notFound();
  }

  return <RecuPubliqueClient token={token} />;
}

export default function RecuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <div className="text-green-600 font-medium">Chargement du reçu...</div>
    </div>}>
      <RecuContent />
    </Suspense>
  );
}