/**
 * Composant de filtres compact pour intégration dans le header glassmorphism
 * Version compacte sans wrapper GlassCard
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X, ChevronDown, RefreshCw } from 'lucide-react';
import { FiltresFactures } from '@/types/facture';

interface FilterHeaderGlassProps {
  onFiltersChange: (filtres: FiltresFactures) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function FilterHeaderGlass({ 
  onFiltersChange, 
  onRefresh,
  isRefreshing = false 
}: FilterHeaderGlassProps) {
  // États des filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [periode, setPeriode] = useState({ debut: '', fin: '' });
  const [nomClient, setNomClient] = useState('');
  const [telClient, setTelClient] = useState('');
  const [statut, setStatut] = useState<'PAYEE' | 'IMPAYEE' | 'TOUS'>('TOUS');
  const [sortBy, setSortBy] = useState<'date' | 'montant' | 'client' | 'statut'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // État d'affichage des filtres avancés
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Effet pour déclencher la recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const filtres: FiltresFactures = {
        searchTerm: searchTerm || undefined,
        periode: periode.debut && periode.fin ? periode : undefined,
        nom_client: nomClient || undefined,
        tel_client: telClient || undefined,
        statut: statut,
        sortBy,
        sortOrder
      };
      
      onFiltersChange(filtres);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, periode, nomClient, telClient, statut, sortBy, sortOrder, onFiltersChange]);

  // Reset des filtres
  const resetFilters = () => {
    setSearchTerm('');
    setPeriode({ debut: '', fin: '' });
    setNomClient('');
    setTelClient('');
    setStatut('TOUS');
    setSortBy('date');
    setSortOrder('desc');
    setShowAdvancedFilters(false);
  };

  const hasActiveFilters = searchTerm || periode.debut || nomClient || telClient || statut !== 'TOUS';

  return (
    <div className="space-y-3">
      {/* Barre de recherche principale */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-200 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher facture..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full pl-10 pr-10 py-2.5 text-sm
              bg-white/10 border border-white/20 rounded-lg 
              text-white placeholder-emerald-200
              focus:bg-white/20 focus:border-white/40 focus:outline-none
              transition-all duration-200
            "
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-200 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bouton filtres avancés */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="
            bg-white/20 text-white p-2.5 rounded-lg 
            hover:bg-white/30 transition-all duration-200
            border border-white/30 flex items-center space-x-1
          "
        >
          <Filter className="w-4 h-4" />
          <ChevronDown 
            className={`w-3 h-3 transition-transform ${
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
              bg-orange-500/90 text-white p-2.5 rounded-lg 
              hover:bg-orange-500 transition-all duration-200
              border border-orange-400/50
            "
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}

        {/* Bouton actualiser */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={isRefreshing}
          className="
            bg-blue-500/90 text-white p-2.5 rounded-lg 
            hover:bg-blue-500 transition-all duration-200
            border border-blue-400/50 disabled:opacity-50
          "
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
        <div className="space-y-4 pt-2">
          {/* Période */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-emerald-100">Période</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={periode.debut}
                onChange={(e) => setPeriode(prev => ({ ...prev, debut: e.target.value }))}
                className="
                  glass-input
                  flex-1 py-2 px-3 text-sm rounded-lg
                  focus:bg-white/20 focus:border-white/40 focus:outline-none
                "
              />
              <input
                type="date"
                value={periode.fin}
                onChange={(e) => setPeriode(prev => ({ ...prev, fin: e.target.value }))}
                className="
                  glass-input
                  flex-1 py-2 px-3 text-sm rounded-lg
                  focus:bg-white/20 focus:border-white/40 focus:outline-none
                "
              />
            </div>
          </div>

          {/* Filtres sur 2 colonnes */}
          <div className="grid grid-cols-2 gap-4">
            {/* Client */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-emerald-100">Client</label>
              <input
                type="text"
                placeholder="Nom..."
                value={nomClient}
                onChange={(e) => setNomClient(e.target.value)}
                className="
                  w-full py-2 px-3 text-sm
                  bg-white/10 border border-white/20 rounded-lg 
                  text-white placeholder-emerald-200
                  focus:bg-white/20 focus:border-white/40 focus:outline-none
                "
              />
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-emerald-100">Téléphone</label>
              <input
                type="text"
                placeholder="77 123 45 67"
                value={telClient}
                onChange={(e) => setTelClient(e.target.value)}
                className="
                  w-full py-2 px-3 text-sm
                  bg-white/10 border border-white/20 rounded-lg 
                  text-white placeholder-emerald-200
                  focus:bg-white/20 focus:border-white/40 focus:outline-none
                "
              />
            </div>
          </div>

          {/* Statut et Tri */}
          <div className="grid grid-cols-2 gap-4">
            {/* Statut */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-emerald-100">Statut</label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as any)}
                className="
                  glass-select
                  w-full py-2 px-3 text-sm rounded-lg
                "
              >
                <option value="TOUS">Tous</option>
                <option value="PAYEE">Payées</option>
                <option value="IMPAYEE">Impayées</option>
              </select>
            </div>

            {/* Tri */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-emerald-100">Trier par</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [sortField, order] = e.target.value.split('-');
                  setSortBy(sortField as any);
                  setSortOrder(order as any);
                }}
                className="
                  glass-select
                  w-full py-2 px-3 text-sm rounded-lg
                "
              >
                <option value="date-desc">Date (récent)</option>
                <option value="date-asc">Date (ancien)</option>
                <option value="montant-desc">Montant (élevé)</option>
                <option value="montant-asc">Montant (faible)</option>
                <option value="client-asc">Client (A-Z)</option>
                <option value="client-desc">Client (Z-A)</option>
              </select>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}