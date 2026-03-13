'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { formatNomCategorie } from '@/lib/format-categorie';

interface CategoryChipsProps {
  categories: string[];
  selected: string;
  onChange: (cat: string) => void;
}

export default function CategoryChips({ categories, selected, onChange }: CategoryChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory -mx-1 px-1"
    >
      {/* Chip "Tout" */}
      <button
        onClick={() => onChange('')}
        className={`flex-shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
          !selected
            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/25'
            : 'bg-white/10 text-white/60 border-white/10 hover:bg-white/15'
        }`}
      >
        Tout
      </button>

      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(selected === cat ? '' : cat)}
          className={`flex-shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${
            selected === cat
              ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/25'
              : 'bg-white/10 text-white/60 border-white/10 hover:bg-white/15'
          }`}
        >
          {formatNomCategorie(cat)}
        </button>
      ))}
    </div>
  );
}
