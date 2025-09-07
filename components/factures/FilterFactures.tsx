/**
 * Composant de filtres et recherche pour les factures
 * Interface complète avec tous les filtres disponibles
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, Filter, X, ChevronDown } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { FiltresFactures } from '@/types/facture';

interface FilterFacturesProps {
  onFiltersChange: (filtres: FiltresFactures) => void;
  totalFactures: number;
  facturesFiltrees: number;
}

export function FilterFactures({ onFiltersChange, totalFactures, facturesFiltrees }: FilterFacturesProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();
  
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

  // Styles responsives
  const getStyles = () => {
    if (isMobile) {
      return {
        container: 'space-y-3',
        searchBar: 'flex-1',
        filterButton: 'p-2',
        input: 'text-sm p-2',
        select: 'text-sm p-2',
        grid: 'grid grid-cols-1 gap-2',
        button: 'text-xs px-2 py-1'
      };
    } else if (isMobileLarge) {
      return {
        container: 'space-y-4',
        searchBar: 'flex-1',
        filterButton: 'p-2.5',
        input: 'text-sm p-2.5',
        select: 'text-sm p-2.5',
        grid: 'grid grid-cols-2 gap-3',
        button: 'text-sm px-3 py-2'
      };
    } else {
      return {
        container: 'space-y-4',
        searchBar: 'flex-1',
        filterButton: 'p-3',
        input: 'text-base p-3',
        select: 'text-base p-3',
        grid: 'grid grid-cols-2 lg:grid-cols-4 gap-4',
        button: 'text-sm px-4 py-2'
      };
    }
  };

  const styles = getStyles();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`
        bg-gradient-to-br from-white to-blue-50/30 
        border border-white/50 rounded-2xl p-4 lg:p-6
        backdrop-blur-sm shadow-sm
        ${styles.container}
      `}
    >
      {/* Barre de recherche principale */}
      <div className="flex items-center space-x-3">
        <div className={`relative ${styles.searchBar}`}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher une facture..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`
              w-full pl-10 pr-4 border border-gray-200 rounded-xl 
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              bg-white/70 backdrop-blur-sm
              ${styles.input}
            `}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bouton filtres avancés */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`
            bg-blue-500 text-white rounded-xl hover:bg-blue-600 
            transition-colors flex items-center space-x-2
            ${styles.filterButton}
          `}
        >
          <Filter className="w-5 h-5" />
          {!isMobile && <span>Filtres</span>}
          <ChevronDown 
            className={`w-4 h-4 transition-transform ${
              showAdvancedFilters ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {/* Bouton reset */}
        {(searchTerm || periode.debut || nomClient || telClient || statut !== 'TOUS') && (
          <button
            onClick={resetFilters}
            className={`
              bg-gray-500 text-white rounded-xl hover:bg-gray-600 
              transition-colors flex items-center
              ${styles.button}
            `}
          >
            <X className="w-4 h-4 mr-1" />
            {!isMobile && <span>Reset</span>}
          </button>
        )}
      </div>

      {/* Compteur de résultats */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          {facturesFiltrees} facture{facturesFiltrees > 1 ? 's' : ''} sur {totalFactures}
        </span>
        {facturesFiltrees !== totalFactures && (
          <span className="text-blue-600 font-medium">Filtrées</span>
        )}
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
        <div className={styles.grid}>
          {/* Période */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Période</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={periode.debut}
                onChange={(e) => setPeriode(prev => ({ ...prev, debut: e.target.value }))}
                className={`
                  flex-1 border border-gray-200 rounded-lg 
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  bg-white/70
                  ${styles.input}
                `}
              />
              <input
                type="date"
                value={periode.fin}
                onChange={(e) => setPeriode(prev => ({ ...prev, fin: e.target.value }))}
                className={`
                  flex-1 border border-gray-200 rounded-lg 
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  bg-white/70
                  ${styles.input}
                `}
              />
            </div>
          </div>

          {/* Client */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Nom client</label>
            <input
              type="text"
              placeholder="Nom du client..."
              value={nomClient}
              onChange={(e) => setNomClient(e.target.value)}
              className={`
                w-full border border-gray-200 rounded-lg 
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                bg-white/70
                ${styles.input}
              `}
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Téléphone</label>
            <input
              type="text"
              placeholder="Numéro de téléphone..."
              value={telClient}
              onChange={(e) => setTelClient(e.target.value)}
              className={`
                w-full border border-gray-200 rounded-lg 
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                bg-white/70
                ${styles.input}
              `}
            />
          </div>

          {/* Statut */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Statut</label>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as any)}
              className={`
                w-full border border-gray-200 rounded-lg 
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                bg-white/70
                ${styles.select}
              `}
            >
              <option value="TOUS">Tous les états</option>
              <option value="PAYEE">Payées</option>
              <option value="IMPAYEE">Impayées</option>
            </select>
          </div>

          {/* Tri */}
          {!isMobile && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Trier par</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`
                    w-full border border-gray-200 rounded-lg 
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-white/70
                    ${styles.select}
                  `}
                >
                  <option value="date">Date</option>
                  <option value="montant">Montant</option>
                  <option value="client">Client</option>
                  <option value="statut">Statut</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Ordre</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className={`
                    w-full border border-gray-200 rounded-lg 
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-white/70
                    ${styles.select}
                  `}
                >
                  <option value="desc">Plus récent</option>
                  <option value="asc">Plus ancien</option>
                </select>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}