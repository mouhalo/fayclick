/**
 * Composant FilterHeader pour la gestion des produits
 * Contient la barre de recherche et les contrôles de vue
 */

'use client';

import { motion } from 'framer-motion';
import { Search, Filter, Grid, List, RefreshCw } from 'lucide-react';

interface ProduitsFilterHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

export function ProduitsFilterHeader({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  showFilters,
  onToggleFilters,
  onRefresh,
  refreshing = false
}: ProduitsFilterHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-300 bg-white/90 backdrop-blur-sm"
        />
      </div>

      {/* Contrôles vue et filtres */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-lg p-1">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid' ? 'bg-white text-green-600' : 'text-white hover:bg-white/20'
            }`}
          >
            <Grid className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-white text-green-600' : 'text-white hover:bg-white/20'
            }`}
          >
            <List className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onToggleFilters}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
              showFilters ? 'bg-white text-green-600' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtres
          </motion.button>
        </div>
      </div>
    </div>
  );
}