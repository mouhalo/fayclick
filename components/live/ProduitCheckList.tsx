'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Produit } from '@/types/produit';

interface ProduitCheckListProps {
  produits: Produit[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
}

const ProduitCheckList: React.FC<ProduitCheckListProps> = ({
  produits,
  selectedIds,
  onSelectionChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce recherche 200ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // Produits eligibles (stock > 0)
  const eligibleIds = useMemo(
    () => produits.filter((p) => (p.niveau_stock || 0) > 0).map((p) => p.id_produit),
    [produits]
  );

  // Produits filtres par recherche
  const filteredProduits = useMemo(() => {
    if (!debouncedSearch.trim()) return produits;
    const term = debouncedSearch.toLowerCase().trim();
    return produits.filter((p) => p.nom_produit.toLowerCase().includes(term));
  }, [produits, debouncedSearch]);

  const handleToggle = useCallback(
    (id: number) => {
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter((sid) => sid !== id));
      } else {
        onSelectionChange([...selectedIds, id]);
      }
    },
    [selectedIds, onSelectionChange]
  );

  const handleSelectAll = useCallback(() => {
    onSelectionChange([...new Set([...selectedIds, ...eligibleIds])]);
  }, [selectedIds, eligibleIds, onSelectionChange]);

  const handleDeselectAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const selectedCount = selectedIds.length;
  const eligibleCount = eligibleIds.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Barre de recherche */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
        />
      </div>

      {/* Compteur + actions */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          <span className="font-semibold text-green-600">{selectedCount}</span>
          {' / '}
          <span className="font-medium">{eligibleCount}</span>
          {' produits selectionnes'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors"
          >
            Tout selectionner
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 font-medium transition-colors"
          >
            Deselectionner
          </button>
        </div>
      </div>

      {/* Liste scrollable */}
      <div className="max-h-[400px] overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
        <AnimatePresence mode="popLayout">
          {filteredProduits.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              Aucun produit trouve
            </div>
          ) : (
            filteredProduits.map((produit) => {
              const stock = produit.niveau_stock || 0;
              const isEpuise = stock <= 0;
              const isSelected = selectedIds.includes(produit.id_produit);

              return (
                <motion.label
                  key={produit.id_produit}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                    isEpuise
                      ? 'opacity-50 cursor-not-allowed bg-gray-50'
                      : isSelected
                        ? 'bg-green-50/60'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isEpuise}
                    onChange={() => !isEpuise && handleToggle(produit.id_produit)}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-40 flex-shrink-0"
                  />

                  {/* Nom produit */}
                  <span
                    className={`flex-1 text-sm truncate ${
                      isEpuise ? 'text-gray-400 line-through' : 'text-gray-800'
                    }`}
                  >
                    {produit.nom_produit}
                  </span>

                  {/* Prix */}
                  <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                    {produit.prix_vente.toLocaleString('fr-FR')} F
                  </span>

                  {/* Badge stock */}
                  {isEpuise ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 whitespace-nowrap">
                      Epuise
                    </span>
                  ) : stock <= 5 ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 whitespace-nowrap">
                      {stock}
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                      {stock}
                    </span>
                  )}
                </motion.label>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProduitCheckList;
