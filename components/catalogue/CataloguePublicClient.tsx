/**
 * Composant client pour l'affichage du catalogue public
 * Inspiré de FacturePubliqueClient.tsx
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  Search,
  Filter,
  AlertCircle,
  Loader,
  ChevronLeft,
  ChevronRight,
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cataloguePublicService } from '@/services/catalogue-public.service';
import { CatalogueResponse, ProduitPublic, FiltresCatalogue } from '@/types/catalogue';
import CarteProduit from './CarteProduit';

interface CataloguePublicClientProps {
  nomStructure: string;
}

export default function CataloguePublicClient({ nomStructure }: CataloguePublicClientProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();

  // États principaux
  const [catalogue, setCatalogue] = useState<CatalogueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États de filtrage
  const [filtres, setFiltres] = useState<FiltresCatalogue>({
    searchTerm: '',
    categorie: ''
  });

  // État du panneau de filtres
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Charger le catalogue
  const loadCatalogue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🛒 Chargement catalogue pour:', nomStructure);

      const catalogueData = await cataloguePublicService.getProduitsPublics(nomStructure);

      if (!catalogueData) {
        throw new Error('Catalogue introuvable');
      }

      const typedCatalogue = catalogueData as CatalogueResponse;
      setCatalogue(typedCatalogue);

      console.log('✅ Catalogue chargé:', {
        nom_structure: typedCatalogue.nom_structure,
        total_produits: typedCatalogue.total_produits
      });

    } catch (err: unknown) {
      console.error('Erreur lors du chargement du catalogue:', err);
      setError(err instanceof Error ? err.message : 'Impossible de charger le catalogue');
    } finally {
      setLoading(false);
    }
  }, [nomStructure]);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  // Filtrer les produits
  const produitsFiltres = useMemo(() => {
    if (!catalogue?.data) return [];

    let filtered = [...catalogue.data];

    // Filtre par nom
    if (filtres.searchTerm.trim() !== '') {
      const searchLower = filtres.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.nom_produit.toLowerCase().includes(searchLower)
      );
    }

    // Filtre par catégorie
    if (filtres.categorie !== '') {
      filtered = filtered.filter(p => p.nom_categorie === filtres.categorie);
    }

    return filtered;
  }, [catalogue, filtres]);

  // Pagination
  const totalPages = Math.ceil(produitsFiltres.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const produitsPage = produitsFiltres.slice(startIndex, endIndex);

  // Liste unique des catégories
  const categories = useMemo(() => {
    if (!catalogue?.data) return [];
    const uniqueCategories = new Set(catalogue.data.map(p => p.nom_categorie).filter(Boolean));
    return Array.from(uniqueCategories).sort();
  }, [catalogue]);

  // Reset pagination quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [filtres]);

  // Handler pour les filtres
  const handleSearchChange = (value: string) => {
    setFiltres(prev => ({ ...prev, searchTerm: value }));
  };

  const handleCategorieChange = (value: string) => {
    setFiltres(prev => ({ ...prev, categorie: value }));
  };

  const resetFiltres = () => {
    setFiltres({ searchTerm: '', categorie: '' });
  };

  // Styles responsifs
  const getStyles = () => {
    if (isMobile) {
      return {
        container: 'px-3 py-4',
        card: 'p-3',
        title: 'text-base',
        subtitle: 'text-sm',
        grid: 'grid-cols-1'
      };
    } else if (isMobileLarge) {
      return {
        container: 'px-4 py-5',
        card: 'p-4',
        title: 'text-lg',
        subtitle: 'text-base',
        grid: 'grid-cols-2'
      };
    } else {
      return {
        container: 'px-6 py-6',
        card: 'p-6',
        title: 'text-xl',
        subtitle: 'text-lg',
        grid: 'grid-cols-3'
      };
    }
  };

  const styles = getStyles();

  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-emerald-600 font-medium text-sm">Chargement du catalogue...</p>
        </motion.div>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-red-800 mb-2">Erreur</h1>
          <p className="text-red-600 mb-4 text-sm">{error}</p>
        </motion.div>
      </div>
    );
  }

  if (!catalogue) return null;

  return (
    <div className={`min-h-screen relative overflow-hidden ${styles.container}`}>
      {/* Background premium avec gradient vert/orange/blanc FayClick */}
      <div className="fixed inset-0 -z-10">
        <motion.div
          animate={{
            background: [
              'radial-gradient(circle at 20% 30%, rgba(16, 185, 129, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(251, 146, 60, 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 30%, rgba(251, 146, 60, 0.15) 0%, transparent 50%), radial-gradient(circle at 20% 70%, rgba(16, 185, 129, 0.2) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 50% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 30%, rgba(16, 185, 129, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(251, 146, 60, 0.15) 0%, transparent 50%)'
            ]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-orange-50/50 to-white"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto relative z-10"
      >
        {/* Header avec nom de la structure et gradient FayClick */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-xl shadow-2xl ${styles.card} mb-6`}
        >
          {/* Background gradient vert/orange/blanc */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-orange-500/5 to-white/50" />

          <div className="text-center relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <Store className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className={`${styles.title} font-bold text-gray-900 mb-2`}>
              {catalogue.nom_structure}
            </h1>
            <p className={`${styles.subtitle} text-gray-600`}>
              Catalogue de produits • {catalogue.total_produits} produit{catalogue.total_produits > 1 ? 's' : ''}
            </p>
          </div>
        </motion.div>

        {/* Zone de recherche et filtres dépliable */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`relative overflow-hidden bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-white/30 ${styles.card} mb-6`}
        >
          {/* Background gradient vert/orange/blanc */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-orange-500/3 to-white/30" />

          <div className="relative z-10 space-y-4">
            {/* Header avec bouton toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg">
                  <Search className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">Recherche & Filtres</h2>
                  <p className="text-xs text-gray-600">
                    {produitsFiltres.length} résultat{produitsFiltres.length > 1 ? 's' : ''}
                    {(filtres.searchTerm || filtres.categorie) && ` sur ${catalogue.total_produits}`}
                  </p>
                </div>
              </div>

              {/* Bouton toggle */}
              <motion.button
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <AnimatePresence mode="wait">
                  {isFilterExpanded ? (
                    <motion.div
                      key="up"
                      initial={{ rotate: 180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -180, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="down"
                      initial={{ rotate: -180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 180, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Zone de filtres dépliable */}
            <AnimatePresence>
              {isFilterExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t border-gray-200 space-y-4">
                    {/* Recherche */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un produit..."
                        value={filtres.searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
                      />
                    </div>

                    {/* Filtre catégorie */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                          value={filtres.categorie}
                          onChange={(e) => handleCategorieChange(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all appearance-none bg-white"
                        >
                          <option value="">Toutes les catégories</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Bouton reset */}
                      {(filtres.searchTerm || filtres.categorie) && (
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          onClick={resetFiltres}
                          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium whitespace-nowrap"
                        >
                          Réinitialiser
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Grille de produits */}
        {produitsPage.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg"
          >
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Aucun produit trouvé
            </h3>
            <p className="text-gray-500 text-sm">
              {filtres.searchTerm || filtres.categorie
                ? 'Essayez de modifier vos critères de recherche'
                : 'Cette structure n\'a pas encore de produits dans son catalogue'
              }
            </p>
          </motion.div>
        ) : (
          <>
            <div className={`grid ${styles.grid} gap-6 mb-6`}>
              {produitsPage.map((produit, index) => (
                <CarteProduit
                  key={produit.id_produit}
                  produit={produit}
                  index={index}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-4 py-6"
              >
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>

                <span className="text-sm font-medium text-gray-700 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
                  Page {currentPage} sur {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}