/**
 * Composant FilterHeader pour la gestion des produits
 * Contient la barre de recherche et les contrôles de vue
 */

'use client';

import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Grid, LayoutList, LayoutGrid, RefreshCw, Printer, FileDown, CheckSquare, ShoppingCart, PanelRightOpen, ChevronDown } from 'lucide-react';

const VIEW_MODES = [
  { key: 'grid',    icon: Grid,       label: 'Grille' },
  { key: 'compact', icon: LayoutGrid, label: 'Compacte' },
  { key: 'table',   icon: LayoutList, label: 'Tableau' },
] as const;

export interface ProduitsFilterHeaderRef {
  focusSearch: () => void;
}

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
  showPanierSide?: boolean;
  onTogglePanierSide?: () => void;
}

export const ProduitsFilterHeader = forwardRef<ProduitsFilterHeaderRef, ProduitsFilterHeaderProps>(({
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
  onToggleModeVente,
  showPanierSide = false,
  onTogglePanierSide
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  const activeView = VIEW_MODES.find(v => v.key === viewMode) ?? VIEW_MODES[0];

  // Fermer dropdown au clic extérieur
  useEffect(() => {
    if (!showViewDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowViewDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showViewDropdown]);

  // Exposer focusSearch() au parent pour auto-focus après ajout au panier
  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }));

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
            ref={inputRef}
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
        {/* Dropdown mode d'affichage */}
        <div ref={dropdownRef} className="relative">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowViewDropdown(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
            title="Mode d'affichage"
          >
            <activeView.icon className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">{activeView.label}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showViewDropdown ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {showViewDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[130px]"
              >
                {VIEW_MODES.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => { onViewModeChange(key); setShowViewDropdown(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                      viewMode === key
                        ? 'bg-green-50 text-green-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Boutons actions */}
        <div className="flex items-center gap-2">
          {/* Bouton Panier latéral (desktop uniquement) */}
          {onTogglePanierSide && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onTogglePanierSide}
              className={`p-2 rounded-lg transition-colors ${
                showPanierSide
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              title={showPanierSide ? 'Masquer le panier latéral' : 'Afficher le panier latéral'}
            >
              <PanelRightOpen className={`w-5 h-5 ${showPanierSide ? 'text-white' : 'text-white'}`} />
            </motion.button>
          )}

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
});

ProduitsFilterHeader.displayName = 'ProduitsFilterHeader';
