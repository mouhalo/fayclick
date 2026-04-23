/**
 * Badge compteur de quota de produits
 * Affiche le nombre de produits actuels / max autorisé par l'abonnement.
 * Couleur adaptative selon le taux d'occupation (vert < 80%, orange >= 80%, rouge = 100%).
 */

'use client';

import { Package, AlertTriangle } from 'lucide-react';

interface QuotaProduitsBadgeProps {
  /** Nombre actuel de produits */
  current: number;
  /** Nombre maximum autorisé */
  max: number;
  /** Callback au clic (ouvre généralement le modal d'info) */
  onClick?: () => void;
  /** Variante "dark" pour les fonds clairs avec texte foncé */
  variant?: 'light' | 'dark';
}

export function QuotaProduitsBadge({
  current,
  max,
  onClick,
  variant = 'light',
}: QuotaProduitsBadgeProps) {
  const ratio = max > 0 ? current / max : 0;
  const atLimit = current >= max;
  const nearLimit = ratio >= 0.8 && !atLimit;

  // Couleurs selon l'état
  let colorClasses = '';
  if (atLimit) {
    colorClasses =
      variant === 'dark'
        ? 'bg-red-500/90 text-white border-red-400 hover:bg-red-600'
        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
  } else if (nearLimit) {
    colorClasses =
      variant === 'dark'
        ? 'bg-amber-500/90 text-white border-amber-400 hover:bg-amber-600'
        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
  } else {
    colorClasses =
      variant === 'dark'
        ? 'bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm'
        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';
  }

  const Icon = atLimit ? AlertTriangle : Package;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-semibold transition-all shadow-sm ${colorClasses} ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
      title={
        atLimit
          ? 'Limite de produits atteinte — cliquez pour voir les options'
          : `${current} produits sur ${max} autorisés`
      }
      aria-label={`${current} produits sur ${max} autorisés`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="tabular-nums">
        <span className={atLimit ? 'font-bold' : ''}>{current}</span>
        <span className="opacity-60 mx-1">/</span>
        <span>{max}</span>
      </span>
      <span className="hidden sm:inline opacity-80 font-normal">
        {atLimit ? 'quota atteint' : 'produits'}
      </span>
    </button>
  );
}
