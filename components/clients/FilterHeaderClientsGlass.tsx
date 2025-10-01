/**
 * Composant de filtres compact pour la gestion des clients
 * Style glassmorphism cohérent avec FilterHeaderGlass des factures
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X, ChevronDown, RefreshCw } from 'lucide-react';

interface FilterHeaderClientsGlassProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function FilterHeaderClientsGlass({
  searchTerm,
  onSearchChange,
  onRefresh,
  isRefreshing = false
}: FilterHeaderClientsGlassProps) {
  // État local pour l'input (mise à jour immédiate)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // État d'affichage des filtres avancés
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Synchroniser l'état local avec la prop
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // Effet pour déclencher la recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchTerm, onSearchChange]);

  const hasActiveFilters = localSearchTerm.length > 0;

  return (
    <div className="space-y-3">
      {/* Barre de recherche principale */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <input
            type="text"
            placeholder="Rechercher client..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="
              w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 text-xs sm:text-sm
              bg-white/80 border border-gray-200 rounded-md sm:rounded-lg
              text-gray-800 placeholder-gray-500
              focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200
              transition-all duration-200
            "
          />
          {localSearchTerm && (
            <button
              onClick={() => setLocalSearchTerm('')}
              className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        {/* Bouton filtres avancés (future implémentation) */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="
            bg-white/80 text-gray-700 p-2 sm:p-2.5 rounded-md sm:rounded-lg
            hover:bg-white hover:text-gray-800 transition-all duration-200
            border border-gray-200 flex items-center space-x-0.5 sm:space-x-1 shadow-sm
          "
        >
          <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <ChevronDown
            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform ${
              showAdvancedFilters ? 'rotate-180' : ''
            }`}
          />
        </motion.button>

        {/* Bouton actualiser */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={isRefreshing}
          className="
            bg-blue-500/90 text-white p-2 sm:p-2.5 rounded-md sm:rounded-lg
            hover:bg-blue-500 transition-all duration-200
            border border-blue-400/50 disabled:opacity-50
          "
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* Filtres avancés (placeholder pour future implémentation) */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{
          height: showAdvancedFilters ? 'auto' : 0,
          opacity: showAdvancedFilters ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="space-y-3 sm:space-y-4 pt-2">
          {/* Future : Filtres avancés (statut paiement, date création, etc.) */}
          <div className="text-center py-4 bg-white/10 rounded-lg border border-white/20">
            <p className="text-white/60 text-xs sm:text-sm">
              Filtres avancés à venir...
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
