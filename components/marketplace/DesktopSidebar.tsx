'use client';

import { useState } from 'react';
import { Package, Tag } from 'lucide-react';
import { formatNomCategorie } from '@/lib/format-categorie';

interface DesktopSidebarProps {
  categories: string[];
  selectedCategorie: string;
  onCategorieChange: (cat: string) => void;
  totalByCategorie?: Record<string, number>;
  onPriceFilter?: (min: number, max: number) => void;
}

export default function DesktopSidebar({
  categories,
  selectedCategorie,
  onCategorieChange,
  totalByCategorie = {},
  onPriceFilter
}: DesktopSidebarProps) {
  const [priceMax, setPriceMax] = useState(100000);

  return (
    <aside className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-20 space-y-4">
        {/* Categories */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-400" />
            <h3 className="text-white font-semibold text-sm">Categories</h3>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => onCategorieChange('')}
              className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                !selectedCategorie
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/20'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/70'
              }`}
            >
              <span className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                Toutes
              </span>
            </button>

            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => onCategorieChange(selectedCategorie === cat ? '' : cat)}
                className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                  selectedCategorie === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/20'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                }`}
              >
                <span className="truncate">{formatNomCategorie(cat)}</span>
                {totalByCategorie[cat] && (
                  <span className="text-[10px] text-white/30 flex-shrink-0 ml-2">
                    {totalByCategorie[cat]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Prix (FCFA) — Slider Stitch */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm">Prix (FCFA)</h3>
          <input
            type="range"
            min={0}
            max={100000}
            step={1000}
            value={priceMax}
            onChange={(e) => {
              const val = Number(e.target.value);
              setPriceMax(val);
              onPriceFilter?.(0, val);
            }}
            className="w-full accent-emerald-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-white/40">
            <span>Min</span>
            <span>Max</span>
          </div>
          <div className="flex justify-between text-xs text-white/60 font-medium">
            <span>0</span>
            <span>{priceMax >= 100000 ? '100K+' : priceMax.toLocaleString('fr-FR')}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
