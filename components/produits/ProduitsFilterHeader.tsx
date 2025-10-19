/**
 * Composant FilterHeader pour la gestion des produits
 * Contient la barre de recherche et les contrôles de vue
 */

'use client';

import { motion } from 'framer-motion';
import { Search, Filter, Grid, List, LayoutGrid, RefreshCw, Camera } from 'lucide-react';

interface ProduitsFilterHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'list' | 'compact';
  onViewModeChange: (mode: 'grid' | 'list' | 'compact') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
  onScanClick?: () => void;
}

export function ProduitsFilterHeader({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  showFilters,
  onToggleFilters,
  onRefresh,
  refreshing = false,
  onScanClick
}: ProduitsFilterHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Barre de recherche avec bouton Scan */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-300 bg-white/90 backdrop-blur-sm"
          />
        </div>

        {/* Bouton Scan */}
        {onScanClick && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onScanClick}
            className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium flex items-center gap-2 hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg"
            aria-label="Scanner un code-barres"
          >
            <Camera className="w-5 h-5" />
            <span className="font-semibold">Scan</span>
          </motion.button>
        )}
      </div>

      {/* Contrôles vue et filtres */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-lg p-1 gap-1">
          {/* Vue Grille normale */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid' ? 'bg-white text-green-600' : 'text-white hover:bg-white/20'
            }`}
            title="Vue grille normale"
          >
            <Grid className="w-4 h-4" />
          </motion.button>

          {/* Vue Compacte */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewModeChange('compact')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'compact' ? 'bg-white text-green-600' : 'text-white hover:bg-white/20'
            }`}
            title="Vue compacte"
          >
            <LayoutGrid className="w-4 h-4" />
          </motion.button>

          {/* Vue Liste */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-white text-green-600' : 'text-white hover:bg-white/20'
            }`}
            title="Vue liste"
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