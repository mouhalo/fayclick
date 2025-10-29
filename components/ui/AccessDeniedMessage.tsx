/**
 * Composant de Message d'Accès Refusé
 * Messages uniformes pour les restrictions de permission
 * 3 variantes : inline, modal, toast
 */

'use client';

import { Lock } from 'lucide-react';

interface AccessDeniedMessageProps {
  /** Nom de la fonctionnalité (ex: "cette fonctionnalité", "la modification des produits") */
  feature: string;

  /** Variante d'affichage */
  variant?: 'inline' | 'modal' | 'toast';
}

export function AccessDeniedMessage({ feature, variant = 'inline' }: AccessDeniedMessageProps) {
  const message = `Seul l'Administrateur a accès à ${feature}.`;

  // Variante MODAL : Centré avec icône large
  if (variant === 'modal') {
    return (
      <div className="text-center p-6">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Accès Restreint
        </h3>
        <p className="text-gray-600">{message}</p>
      </div>
    );
  }

  // Variante TOAST : Texte simple
  if (variant === 'toast') {
    return <>{message}</>;
  }

  // Variante INLINE (par défaut) : Carte orange
  return (
    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
      <Lock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-orange-800">{message}</p>
    </div>
  );
}
