/**
 * Composant FilterHeader pour la gestion des produits
 * Contient la barre de recherche et les contrôles de vue
 */

'use client';

import { motion } from 'framer-motion';
import { Search, Filter, Grid, LayoutList, LayoutGrid, RefreshCw, Printer, FileDown, CheckSquare, ShoppingCart } from 'lucide-react';

interface ProduitsFilterHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'table' | 'compact';
  onViewModeChange: (mode: 'grid' | 'table' | 'compact') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
  onPrintClick?: () => void;
  onExportCSV?: () => void;
  isExporting?: boolean;
  selectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  modeVente?: boolean;
  onToggleModeVente?: () => void;
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
  onPrintClick,
  onExportCSV,
  isExporting = false,
  selectionMode = false,
  onToggleSelectionMode,
  modeVente = false,
  onToggleModeVente
}: ProduitsFilterHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Barre de recherche avec bouton Actualiser */}
      <div className="flex gap-2">
        {/* Toggle Mode Vente */}
        {onToggleModeVente && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onToggleModeVente}
            className={`px-3 py-3 rounded-lg font-medium flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg ${
              modeVente
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white ring-2 ring-green-300'
                : 'bg-white/80 text-gray-500 hover:bg-white'
            }`}
            aria-label={modeVente ? 'Mode Vente actif' : 'Activer Mode Vente'}
            title={modeVente ? 'Mode Vente actif - Cliquez pour désactiver' : 'Activer Mode Vente'}
          >
            <ShoppingCart className="w-5 h-5" />
          </motion.button>
        )}

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={modeVente ? "Scannez ou tapez pour vendre..." : "Nom ou code-barres..."}
            className={`w-full pl-10 pr-4 py-3 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 bg-white/90 backdrop-blur-sm ${
              modeVente ? 'focus:ring-green-400 ring-1 ring-green-300' : 'focus:ring-green-300'
            }`}
          />
        </div>

        {/* Bouton Actualiser */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={refreshing}
          className="px-3 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium flex items-center gap-1.5 hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
          aria-label="Actualiser la liste"
          title="Actualiser la liste"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* Contrôles vue et filtres - Style glassmorphe harmonisé avec l'accordéon */}
      <div className="flex items-center justify-between p-2.5 sm:p-3 bg-emerald-900/40 backdrop-blur-md rounded-xl border border-white/30 shadow-lg">
        {/* Boutons de vue */}
        <div className="flex items-center bg-white/10 rounded-lg p-1 gap-1">
          {/* Vue Grille normale */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid' ? 'bg-white text-green-600 shadow-sm' : 'text-white hover:bg-white/20'
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
              viewMode === 'compact' ? 'bg-white text-green-600 shadow-sm' : 'text-white hover:bg-white/20'
            }`}
            title="Vue compacte"
          >
            <LayoutGrid className="w-4 h-4" />
          </motion.button>

          {/* Vue Tableau */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewModeChange('table')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'table' ? 'bg-white text-green-600 shadow-sm' : 'text-white hover:bg-white/20'
            }`}
            title="Vue tableau"
          >
            <LayoutList className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Boutons actions */}
        <div className="flex items-center gap-2">
          {/* Bouton Mode Sélection */}
          {onToggleSelectionMode && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onToggleSelectionMode}
              className={`p-2 rounded-lg transition-colors ${
                selectionMode
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              title={selectionMode ? 'Quitter la sélection' : 'Sélectionner des produits'}
            >
              <CheckSquare className={`w-5 h-5 ${selectionMode ? 'text-white' : 'text-white'}`} />
            </motion.button>
          )}

          {/* Bouton Impression */}
          {onPrintClick && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onPrintClick}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              title="Imprimer la liste des produits"
            >
              <Printer className="w-5 h-5 text-white" />
            </motion.button>
          )}

          {/* Bouton Export CSV */}
          {onExportCSV && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onExportCSV}
              disabled={isExporting}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
              title="Exporter en CSV"
            >
              <FileDown className={`w-5 h-5 text-white ${isExporting ? 'animate-pulse' : ''}`} />
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onToggleFilters}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
              showFilters ? 'bg-white text-green-600 shadow-sm' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtres</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}