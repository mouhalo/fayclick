/**
 * Dropdown de filtre par boutique pour la liste des achats du client.
 *
 * Comportement :
 *   - Affiché uniquement si `boutiques.length > 1` (pas d'intérêt à filtrer
 *     sur une seule boutique).
 *   - Sélection "Toutes les boutiques" => `onChange(null)`.
 *   - Sélection d'une boutique => `onChange(id_structure)`.
 *   - Liste triée alphabétiquement (case-insensitive, locale FR).
 *
 * Contexte : Sprint 3 UI "Historique Client Public" (US-4 du PRD).
 *
 * @module components/historique/FiltreBoutique
 */

'use client';

import { ChevronDown, Store } from 'lucide-react';
import type { BoutiqueClient } from '@/types/historique';

interface FiltreBoutiqueProps {
  /** Liste exhaustive des boutiques où le client a acheté. */
  boutiques: BoutiqueClient[];
  /** ID de la boutique sélectionnée, ou `null` pour "toutes". */
  selectedId: number | null;
  /** Callback de changement (null si "toutes"). */
  onChange: (id: number | null) => void;
  /** Désactive le select (ex: pendant un load more en vol). */
  disabled?: boolean;
}

export default function FiltreBoutique({
  boutiques,
  selectedId,
  onChange,
  disabled = false,
}: FiltreBoutiqueProps) {
  // Filtre invisible si une seule boutique (ou zéro)
  if (!boutiques || boutiques.length <= 1) {
    return null;
  }

  // Tri alphabétique stable (locale FR, case-insensitive)
  const sortedBoutiques = [...boutiques].sort((a, b) =>
    a.nom_structure.localeCompare(b.nom_structure, 'fr', { sensitivity: 'base' })
  );

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'all') {
      onChange(null);
    } else {
      const id = parseInt(value, 10);
      onChange(Number.isNaN(id) ? null : id);
    }
  };

  return (
    <div className="relative">
      <label
        htmlFor="filtre-boutique"
        className="sr-only"
      >
        Filtrer par boutique
      </label>

      {/* Icône à gauche */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-300">
        <Store className="w-4 h-4" aria-hidden="true" />
      </div>

      {/* Select natif (UX mobile optimale) avec chevron custom */}
      <select
        id="filtre-boutique"
        value={selectedId === null ? 'all' : String(selectedId)}
        onChange={handleChange}
        disabled={disabled}
        className="
          w-full appearance-none
          pl-10 pr-10 py-2.5
          bg-white/10 backdrop-blur-md
          border border-white/20
          rounded-xl
          text-sm text-white
          focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/40
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
        "
      >
        <option value="all" className="bg-slate-800 text-white">
          Toutes les boutiques
        </option>
        {sortedBoutiques.map((b) => (
          <option
            key={b.id_structure}
            value={String(b.id_structure)}
            className="bg-slate-800 text-white"
          >
            {b.nom_structure}
          </option>
        ))}
      </select>

      {/* Chevron à droite */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/60">
        <ChevronDown className="w-4 h-4" aria-hidden="true" />
      </div>
    </div>
  );
}
