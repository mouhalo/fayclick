/**
 * Composant client pour la marketplace globale FayClick
 * Redesign avec hero, carrousel boutiques, recherche intelligente
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Filter, Loader, AlertCircle } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cataloguesPublicService } from '@/services/catalogues-public.service';
import { marketplaceSearchService } from '@/services/marketplace-search.service';
import { CataloguesGlobalResponse, ProduitPublicGlobal } from '@/types/catalogues';
import { StructurePublique, MarketplaceStats } from '@/types/marketplace';
import CarteProduit from './CarteProduit';
import MarketplaceHero from '@/components/marketplace/MarketplaceHero';
import BoutiquesCarousel from '@/components/marketplace/BoutiquesCarousel';
import StickySearchNav from '@/components/marketplace/StickySearchNav';
import MarketplaceFAB from '@/components/marketplace/MarketplaceFAB';
import { SkeletonCarteProduit } from '@/components/marketplace/SkeletonCards';

export default function CataloguesGlobalClient() {
  const { isMobile, isMobileLarge } = useBreakpoint();

  // Etats principaux
  const [catalogue, setCatalogue] = useState<CataloguesGlobalResponse | null>(null);
  const [structures, setStructures] = useState<StructurePublique[]>([]);
  const [stats, setStats] = useState<MarketplaceStats>({ total_produits: 0, total_structures: 0, total_categories: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [categorieFiltre, setCategorieFiltre] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);

  // Charger les donnees
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [catalogueData, structuresData, statsData] = await Promise.all([
        cataloguesPublicService.getAllProduitsPublics(),
        marketplaceSearchService.getStructures(),
        marketplaceSearchService.getStats()
      ]);

      setCatalogue(catalogueData);
      setStructures(structuresData);
      setStats(statsData);
    } catch (err: unknown) {
      console.error('Erreur chargement marketplace:', err);
      setError(err instanceof Error ? err.message : 'Impossible de charger la marketplace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrer les produits
  const produitsFiltres = useMemo(() => {
    if (!catalogue?.data) return [];
    let filtered = [...catalogue.data];
    if (categorieFiltre) {
      filtered = filtered.filter(p => p.nom_categorie === categorieFiltre);
    }
    return filtered;
  }, [catalogue, categorieFiltre]);

  // Produits visibles (charger plus)
  const produitsVisibles = produitsFiltres.slice(0, visibleCount);
  const hasMore = visibleCount < produitsFiltres.length;

  // Categories uniques
  const categories = useMemo(() => {
    if (!catalogue?.data) return [];
    const unique = new Set(catalogue.data.map(p => p.nom_categorie).filter(Boolean));
    return Array.from(unique).sort();
  }, [catalogue]);

  // Reset visible count quand filtre change
  useEffect(() => {
    setVisibleCount(12);
  }, [categorieFiltre]);

  // Styles responsifs — 3 colonnes mobile, 4 desktop, 5 xl
  const gridCols = isMobile ? 'grid-cols-3' : isMobileLarge ? 'grid-cols-3' : 'grid-cols-4 xl:grid-cols-5';

  // Chargement
  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900">
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-6">
          {/* Skeleton hero */}
          <div className="animate-pulse rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 p-8 mb-6">
            <div className="w-16 h-16 bg-gray-300/20 rounded-full mx-auto mb-3" />
            <div className="h-6 bg-gray-300/20 rounded w-48 mx-auto mb-2" />
            <div className="h-4 bg-gray-300/20 rounded w-64 mx-auto mb-5" />
            <div className="h-12 bg-gray-300/20 rounded-full max-w-xl mx-auto" />
          </div>
          {/* Skeleton grille */}
          <div className={`grid ${gridCols} gap-2 sm:gap-3 md:gap-4`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCarteProduit key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Erreur
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background premium anime */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900">
        <motion.div
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, rgba(20, 184, 166, 0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 80%, rgba(5, 150, 105, 0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.3) 0%, transparent 50%)'
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto relative z-10 px-3 py-4 md:px-6 md:py-6"
      >
        {/* 1. Hero avec recherche */}
        <MarketplaceHero stats={stats} />

        {/* 2. Carrousel boutiques */}
        <BoutiquesCarousel structures={structures} />

        {/* 3. Section Tous les produits + filtre categorie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between mb-4 gap-3"
        >
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-300" />
            <h2 className="text-white font-semibold text-sm md:text-base">
              Tous les produits
            </h2>
            <span className="text-emerald-300/60 text-xs">
              ({produitsFiltres.length})
            </span>
          </div>

          {/* Select categorie glassmorphe */}
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-300 pointer-events-none" />
            <select
              value={categorieFiltre}
              onChange={(e) => setCategorieFiltre(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white appearance-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/40 transition-all"
            >
              <option value="" className="bg-slate-800">Toutes categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* 4. Grille produits */}
        {produitsVisibles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white/10 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/20"
          >
            <Package className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Aucun produit trouve</h3>
            <p className="text-emerald-200 text-sm">
              {categorieFiltre
                ? 'Essayez une autre categorie'
                : 'Aucun produit public disponible pour le moment'
              }
            </p>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={`grid ${gridCols} gap-2 sm:gap-3 md:gap-4 mb-6`}
            >
              {produitsVisibles.map((produit, index) => (
                <CarteProduit
                  key={`${produit.id_structure}-${produit.id_produit}`}
                  produit={produit}
                  index={index}
                  showStructureName={true}
                />
              ))}
            </motion.div>

            {/* 5. Bouton Charger plus */}
            {hasMore && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center py-6"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setVisibleCount(prev => prev + 12)}
                  className="px-8 py-3 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 hover:bg-emerald-500/30 text-white font-semibold text-sm transition-all"
                >
                  Charger plus ({produitsFiltres.length - visibleCount} restant{produitsFiltres.length - visibleCount > 1 ? 's' : ''})
                </motion.button>
              </motion.div>
            )}
          </>
        )}
      </motion.div>

      {/* 6. Sticky search + FAB */}
      <StickySearchNav />
      <MarketplaceFAB />
    </div>
  );
}
