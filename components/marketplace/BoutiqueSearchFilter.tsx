'use client';

import { motion } from 'framer-motion';
import { Search, Filter, X } from 'lucide-react';
import { formatNomCategorie } from '@/lib/format-categorie';

interface BoutiqueSearchFilterProps {
  searchTerm: string;
  categorie: string;
  categories: string[];
  totalResultats: number;
  totalProduits: number;
  onSearchChange: (value: string) => void;
  onCategorieChange: (value: string) => void;
  onReset: () => void;
}

export default function BoutiqueSearchFilter({
  searchTerm,
  categorie,
  categories,
  totalResultats,
  totalProduits,
  onSearchChange,
  onCategorieChange,
  onReset
}: BoutiqueSearchFilterProps) {
  const hasFilters = searchTerm || categorie;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="relative overflow-hidden rounded-2xl shadow-xl border border-white/20 p-3 md:p-4 mb-6"
    >
      <div className="absolute inset-0 bg-white/10 backdrop-blur-2xl" />

      <div className="relative z-10 flex flex-col sm:flex-row gap-2">
        {/* Recherche produit */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all text-white placeholder-emerald-200/60"
          />
        </div>

        {/* Select categorie */}
        <div className="relative sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300 pointer-events-none" />
          <select
            value={categorie}
            onChange={(e) => onCategorieChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-emerald-400/50 text-white appearance-none"
          >
            <option value="" className="bg-slate-800">Toutes categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat} className="bg-slate-800">{formatNomCategorie(cat)}</option>
            ))}
          </select>
        </div>

        {/* Badge resultats + reset */}
        {hasFilters && (
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <span className="text-emerald-200 text-xs whitespace-nowrap">
              {totalResultats}/{totalProduits}
            </span>
            <button
              onClick={onReset}
              className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200 transition-colors"
              aria-label="Reinitialiser filtres"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
