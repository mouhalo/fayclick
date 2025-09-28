/**
 * Composant de filtres pour les paiements (reçus)
 * Adapté du FilterHeaderGlass avec des filtres spécifiques aux paiements
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X, ChevronDown, RefreshCw } from 'lucide-react';

interface FiltresPaiements {
  searchTerm?: string;
  periode?: { debut: string; fin: string };
  nom_client?: string;
  tel_client?: string;
  methode_paiement?: string;
  sortBy?: 'date' | 'montant' | 'client' | 'methode';
  sortOrder?: 'asc' | 'desc';
}

interface FilterHeaderPaiementsGlassProps {
  onFiltersChange: (filtres: FiltresPaiements) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function FilterHeaderPaiementsGlass({
  onFiltersChange,
  onRefresh,
  isRefreshing = false
}: FilterHeaderPaiementsGlassProps) {
  // États des filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [periode, setPeriode] = useState({ debut: '', fin: '' });
  const [nomClient, setNomClient] = useState('');
  const [telClient, setTelClient] = useState('');
  const [methodePaiement, setMethodePaiement] = useState<string>('TOUS');
  const [sortBy, setSortBy] = useState<'date' | 'montant' | 'client' | 'methode'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // État d'affichage des filtres avancés
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Effet pour déclencher la recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const filtres: FiltresPaiements = {
        searchTerm: searchTerm || undefined,
        periode: periode.debut && periode.fin ? periode : undefined,
        nom_client: nomClient || undefined,
        tel_client: telClient || undefined,
        methode_paiement: methodePaiement !== 'TOUS' ? methodePaiement : undefined,
        sortBy,
        sortOrder
      };

      onFiltersChange(filtres);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, periode, nomClient, telClient, methodePaiement, sortBy, sortOrder, onFiltersChange]);

  // Reset des filtres
  const resetFilters = () => {
    setSearchTerm('');
    setPeriode({ debut: '', fin: '' });
    setNomClient('');
    setTelClient('');
    setMethodePaiement('TOUS');
    setSortBy('date');
    setSortOrder('desc');
    setShowAdvancedFilters(false);
  };

  const hasActiveFilters = searchTerm || periode.debut || nomClient || telClient || methodePaiement !== 'TOUS';

  return (
    <div className="space-y-3">
      {/* Barre de recherche principale */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <input
            type="text"
            placeholder="Rechercher reçu, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 text-xs sm:text-sm
              bg-white/80 border border-gray-200 rounded-md sm:rounded-lg
              text-gray-800 placeholder-gray-500
              focus:bg-white focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-200
              transition-all duration-200
            "
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        {/* Bouton filtres avancés */}
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

        {/* Bouton reset */}
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetFilters}
            className="
              bg-orange-500/90 text-white p-2 sm:p-2.5 rounded-md sm:rounded-lg
              hover:bg-orange-500 transition-all duration-200
              border border-orange-400/50
            "
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.button>
        )}

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

      {/* Filtres avancés */}
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
          {/* Période */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-xs sm:text-sm font-medium text-emerald-100">Période</label>
            <div className="flex space-x-1.5 sm:space-x-2">
              <input
                type="date"
                value={periode.debut}
                onChange={(e) => setPeriode(prev => ({ ...prev, debut: e.target.value }))}
                className="
                  flex-1 py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm rounded-md sm:rounded-lg
                  bg-white/80 border border-gray-200 text-gray-800
                  focus:bg-white focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-200
                  transition-all duration-200
                "
              />
              <input
                type="date"
                value={periode.fin}
                onChange={(e) => setPeriode(prev => ({ ...prev, fin: e.target.value }))}
                className="
                  flex-1 py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm rounded-md sm:rounded-lg
                  bg-white/80 border border-gray-200 text-gray-800
                  focus:bg-white focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-200
                  transition-all duration-200
                "
              />
            </div>
          </div>

          {/* Filtres sur 2 colonnes */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {/* Client */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs font-medium text-white">Client</label>
              <input
                type="text"
                placeholder="Nom..."
                value={nomClient}
                onChange={(e) => setNomClient(e.target.value)}
                className="
                  w-full py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm
                  bg-white/80 border border-gray-200 rounded-md sm:rounded-lg
                  text-gray-800 placeholder-gray-500
                  focus:bg-white focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-200
                  transition-all duration-200
                "
              />
            </div>

            {/* Téléphone */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs font-medium text-white">Téléphone</label>
              <input
                type="text"
                placeholder="77 123..."
                value={telClient}
                onChange={(e) => setTelClient(e.target.value)}
                className="
                  w-full py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm
                  bg-white/80 border border-gray-200 rounded-md sm:rounded-lg
                  text-gray-800 placeholder-gray-500
                  focus:bg-white focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-200
                  transition-all duration-200
                "
              />
            </div>
          </div>

          {/* Méthode de paiement et Tri */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {/* Méthode de paiement */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs font-medium text-white">Méthode</label>
              <select
                value={methodePaiement}
                onChange={(e) => setMethodePaiement(e.target.value)}
                className="
                  w-full py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm rounded-md sm:rounded-lg
                  bg-white/80 border border-gray-200 text-gray-800
                  focus:bg-white focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-200
                  transition-all duration-200
                "
              >
                <option value="TOUS">Toutes</option>
                <option value="orange-money">OM</option>
                <option value="wave">Wave</option>
                <option value="free-money">Free</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            {/* Tri */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs font-medium text-white">Tri</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [sortField, order] = e.target.value.split('-');
                  setSortBy(sortField as any);
                  setSortOrder(order as any);
                }}
                className="
                  w-full py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm rounded-md sm:rounded-lg
                  bg-white/80 border border-gray-200 text-gray-800
                  focus:bg-white focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-200
                  transition-all duration-200
                "
              >
                <option value="date-desc">Date ↓</option>
                <option value="date-asc">Date ↑</option>
                <option value="montant-desc">Montant ↓</option>
                <option value="montant-asc">Montant ↑</option>
                <option value="client-asc">Client A-Z</option>
                <option value="client-desc">Client Z-A</option>
                <option value="methode-asc">Méthode A-Z</option>
                <option value="methode-desc">Méthode Z-A</option>
              </select>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}