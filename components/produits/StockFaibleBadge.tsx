/**
 * Badge compteur "stock faible"
 * Affiche le nombre de produits dont le stock est inférieur au seuil.
 * Un clic active (ou retire) le filtre "stock < seuil" de la liste.
 */

'use client';

import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';

interface StockFaibleBadgeProps {
  /** Nombre de produits sous le seuil */
  count: number;
  /** Seuil courant (stock < seuil) */
  seuil: number;
  /** Le filtre "stock < seuil" est actuellement appliqué */
  actif: boolean;
  onClick: () => void;
  /** Variante "dark" pour les fonds sombres (mobile) */
  variant?: 'light' | 'dark';
}

export function StockFaibleBadge({
  count,
  seuil,
  actif,
  onClick,
  variant = 'light',
}: StockFaibleBadgeProps) {
  const t = useTranslations('produits');

  let colorClasses = '';
  if (actif) {
    colorClasses = 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600';
  } else if (count > 0) {
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

  const Icon = actif ? X : count > 0 ? AlertTriangle : CheckCircle2;
  const titre = actif ? t('stockFaible.removeFilter') : t('stockFaible.badgeTitle', { seuil });

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer ${colorClasses}`}
      title={titre}
      aria-label={titre}
      aria-pressed={actif}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="tabular-nums font-bold">{count}</span>
      <span className="opacity-80 font-normal">{t('stockFaible.badgeLabel', { seuil })}</span>
    </button>
  );
}
