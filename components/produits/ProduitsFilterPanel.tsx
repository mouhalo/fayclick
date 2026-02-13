'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, RotateCcw, Check, Package, DollarSign, Tag } from 'lucide-react';
import { Produit, ComparisonOperator, FiltreAvance } from '@/types/produit';

interface ProduitsFilterPanelProps {
  isOpen: boolean;
  produits: Produit[];
  onApplyFilters: (filtres: FiltreAvance) => void;
  onResetFilters: () => void;
  activeFiltersCount: number;
}

export function ProduitsFilterPanel({ isOpen, produits, onApplyFilters, onResetFilters, activeFiltersCount }: ProduitsFilterPanelProps) {
  const [categorie, setCategorie] = useState<string>('');
  const [stockOperator, setStockOperator] = useState<ComparisonOperator | ''>('');
  const [stockValue, setStockValue] = useState<string>('');
  const [prixOperator, setPrixOperator] = useState<ComparisonOperator | ''>('');
  const [prixValue, setPrixValue] = useState<string>('');

  // Synchroniser les états locaux quand les filtres sont réinitialisés depuis l'extérieur
  useEffect(() => {
    if (activeFiltersCount === 0) {
      setCategorie('');
      setStockOperator('');
      setStockValue('');
      setPrixOperator('');
      setPrixValue('');
    }
  }, [activeFiltersCount]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    produits.forEach(p => {
      if (p.nom_categorie) cats.add(p.nom_categorie);
    });
    return Array.from(cats).sort();
  }, [produits]);

  const operateurs: { value: ComparisonOperator; label: string }[] = [
    { value: '<', label: '< Inférieur' },
    { value: '>', label: '> Supérieur' },
    { value: '=', label: '= Égal' },
    { value: '<=', label: '≤ Inférieur ou égal' },
    { value: '>=', label: '≥ Supérieur ou égal' },
  ];

  const handleApply = () => {
    onApplyFilters({
      categorie: categorie || undefined,
      stockOperator: stockOperator || undefined,
      stockValue: stockValue ? Number(stockValue) : undefined,
      prixOperator: prixOperator || undefined,
      prixValue: prixValue ? Number(prixValue) : undefined,
    });
  };

  const handleReset = () => {
    setCategorie('');
    setStockOperator('');
    setStockValue('');
    setPrixOperator('');
    setPrixValue('');
    onResetFilters();
  };

  const localFiltersCount = [
    categorie,
    stockOperator && stockValue,
    prixOperator && prixValue,
  ].filter(Boolean).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="mt-3 p-4 bg-white/15 backdrop-blur-md rounded-xl border border-white/30 space-y-4">
            {/* Titre avec badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-white" />
                <span className="text-white font-semibold text-sm">Filtres avancés</span>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <button onClick={handleReset} className="text-white/70 hover:text-white text-xs flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Réinitialiser
              </button>
            </div>

            {/* Grille de filtres */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              {/* Filtre Categorie */}
              <div className="space-y-1.5">
                <label className="text-white/80 text-xs font-medium flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Catégorie
                </label>
                <select
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-300 appearance-none"
                >
                  <option value="" className="text-gray-800">Toutes les catégories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat} className="text-gray-800">{cat}</option>
                  ))}
                </select>
              </div>

              {/* Filtre Stock */}
              <div className="space-y-1.5">
                <label className="text-white/80 text-xs font-medium flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Niveau de stock
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={stockOperator}
                    onChange={(e) => setStockOperator(e.target.value as ComparisonOperator | '')}
                    className="w-24 px-2 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  >
                    <option value="" className="text-gray-800">--</option>
                    {operateurs.map(op => (
                      <option key={op.value} value={op.value} className="text-gray-800">{op.value}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={stockValue}
                    onChange={(e) => setStockValue(e.target.value)}
                    placeholder="Quantité"
                    min="0"
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-300"
                  />
                </div>
              </div>

              {/* Filtre Prix */}
              <div className="space-y-1.5">
                <label className="text-white/80 text-xs font-medium flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Prix de vente (FCFA)
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={prixOperator}
                    onChange={(e) => setPrixOperator(e.target.value as ComparisonOperator | '')}
                    className="w-24 px-2 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  >
                    <option value="" className="text-gray-800">--</option>
                    {operateurs.map(op => (
                      <option key={op.value} value={op.value} className="text-gray-800">{op.value}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={prixValue}
                    onChange={(e) => setPrixValue(e.target.value)}
                    placeholder="Prix"
                    min="0"
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-300"
                  />
                </div>
              </div>
            </div>

            {/* Bouton Appliquer */}
            <div className="flex gap-2 pt-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleApply}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all shadow-md"
              >
                <Check className="w-4 h-4" />
                Appliquer les filtres
                {localFiltersCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">{localFiltersCount}</span>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
