'use client';

import { Table2 } from 'lucide-react';

interface ChartTableButtonProps {
  /** Couleur d'accent au hover/focus — alignée sur la carte hôte. */
  color: 'emerald' | 'violet';
  /** Callback d'ouverture du modal tableau. */
  onClick: () => void;
  /** Libellé accessible (aria-label + title) — chaîne i18n. */
  label: string;
}

/**
 * Bouton-icône « Afficher les données en tableau ».
 *
 * Placé dans le coin supérieur droit du header des cartes graphiques
 * (EvolutionChart, EvolutionMargesChart). Neutre gris au repos, teinté
 * à la couleur de la carte au hover/focus.
 */
export default function ChartTableButton({
  color,
  onClick,
  label,
}: ChartTableButtonProps) {
  const colorClasses =
    color === 'emerald'
      ? 'hover:text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-500'
      : 'hover:text-violet-600 hover:bg-violet-50 focus:ring-violet-500';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`p-2 rounded-lg text-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 ${colorClasses}`}
    >
      <Table2 className="w-[18px] h-[18px]" />
    </button>
  );
}
