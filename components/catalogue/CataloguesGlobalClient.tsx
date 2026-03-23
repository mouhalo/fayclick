/**
 * Composant client pour la marketplace globale FayClick
 * Version Boutiques-First : focus sur les boutiques, pas les produits
 * Les produits sont accessibles uniquement via /catalogue?id=X
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Store, AlertCircle, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cataloguesPublicService } from '@/services/catalogues-public.service';
import { marketplaceSearchService } from '@/services/marketplace-search.service';
import { AllStructuresResponse, StructureListItem, StructurePublique, MarketplaceStats } from '@/types/marketplace';
import MarketplaceHero from '@/components/marketplace/MarketplaceHero';
import BoutiquesCarousel from '@/components/marketplace/BoutiquesCarousel';
import StickySearchNav from '@/components/marketplace/StickySearchNav';
import BottomNavMarketplace from '@/components/marketplace/BottomNavMarketplace';
import MarketplaceNavbar from '@/components/marketplace/MarketplaceNavbar';
import CarteBoutiqueVedette from '@/components/marketplace/CarteBoutiqueVedette';
import CarteBoutiqueStandard from '@/components/marketplace/CarteBoutiqueStandard';
import TypeStructureChips from '@/components/marketplace/TypeStructureChips';
import { SkeletonCarteBoutique } from '@/components/marketplace/SkeletonCards';

export default function CataloguesGlobalClient() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();

  // Etats principaux
  const [structuresData, setStructuresData] = useState<AllStructuresResponse | null>(null);
  const [stats, setStats] = useState<MarketplaceStats>({ total_produits: 0, total_structures: 0, total_categories: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres pour "Toutes les boutiques"
  const [typeFiltre, setTypeFiltre] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);

  // Bottom nav
  const [activeTab, setActiveTab] = useState<'home' | 'boutiques' | 'search'>('home');

  // Charger les donnees (LEGER — pas de produits)
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allStructures, statsData] = await Promise.all([
        cataloguesPublicService.getAllStructures(),
        marketplaceSearchService.getStats()
      ]);

      setStructuresData(allStructures);
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

  // Navigation vers une boutique
  const handleBoutiqueClick = useCallback((structure: StructureListItem) => {
    router.push(`/catalogue?id=${structure.id_structure}`);
  }, [router]);

  // Boutiques vedettes (avec produits publies)
  const vedettes = useMemo(() => {
    if (!structuresData?.structures) return [];
    return structuresData.structures.filter(s => s.a_des_produits);
  }, [structuresData]);

  // Toutes les boutiques filtrees par type
  const toutesBoutiquesFiltrees = useMemo(() => {
    if (!structuresData?.structures) return [];
    if (!typeFiltre) return structuresData.structures;
    return structuresData.structures.filter(s =>
      s.type_structure?.toUpperCase().includes(typeFiltre)
    );
  }, [structuresData, typeFiltre]);

  // Pagination "Charger plus"
  const boutiquesVisibles = toutesBoutiquesFiltrees.slice(0, visibleCount);
  const hasMore = visibleCount < toutesBoutiquesFiltrees.length;
  const remaining = toutesBoutiquesFiltrees.length - visibleCount;

  // Compteurs par type pour les chips
  const countsByType = useMemo(() => {
    if (!structuresData?.structures) return {};
    const counts: Record<string, number> = {};
    structuresData.structures.forEach(s => {
      const type = s.type_structure?.toUpperCase() || '';
      if (type.includes('COMMERCIALE')) counts['COMMERCIALE'] = (counts['COMMERCIALE'] || 0) + 1;
      else if (type.includes('SCOLAIRE')) counts['SCOLAIRE'] = (counts['SCOLAIRE'] || 0) + 1;
      else if (type.includes('IMMOBILIER')) counts['IMMOBILIER'] = (counts['IMMOBILIER'] || 0) + 1;
      else if (type.includes('PRESTATAIRE')) counts['PRESTATAIRE'] = (counts['PRESTATAIRE'] || 0) + 1;
    });
    return counts;
  }, [structuresData]);

  // Structures pour le carrousel (vedettes, max 15)
  const structuresCarousel: StructurePublique[] = useMemo(() => {
    return vedettes.slice(0, 15).map(s => ({
      id_structure: s.id_structure,
      nom_structure: s.nom_structure,
      logo_structure: s.logo,
      type_structure: s.type_structure,
      telephone: s.mobile_om,
      adresse: s.adresse,
      total_produits: s.nb_produits_publics,
      categories: []
    }));
  }, [vedettes]);

  // Reset visibleCount quand filtre change
  useEffect(() => {
    setVisibleCount(24);
  }, [typeFiltre]);

  // Grille responsive
  const gridCols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

  // === LOADING ===
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
          {/* Skeleton boutiques grid */}
          <div className={`grid ${gridCols} gap-3 md:gap-4`}>
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCarteBoutique key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // === ERROR ===
  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white mb-2">Erreur</h1>
          <p className="text-white/60 mb-4 text-sm">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-colors"
          >
            Reessayer
          </button>
        </motion.div>
      </div>
    );
  }

  if (!structuresData) return null;

  return (
    <div className="min-h-screen relative overflow-hidden pb-20 lg:pb-0">
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
        {/* 0. Navbar desktop */}
        <MarketplaceNavbar />

        {/* 1. Hero avec recherche + stats */}
        <MarketplaceHero stats={stats} />

        {/* 2. Carrousel boutiques populaires */}
        <BoutiquesCarousel structures={structuresCarousel} />

        {/* ============================================ */}
        {/* 3. SECTION : BOUTIQUES VEDETTES              */}
        {/* ============================================ */}
        {vedettes.length > 0 && (
          <motion.section
            id="boutiques-vedettes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            {/* Titre section */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-white font-semibold text-sm md:text-base">
                    Boutiques avec catalogue en ligne
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-bold">
                    Vedettes
                  </span>
                </div>
                <p className="text-white/40 text-xs">
                  {vedettes.length} marchand{vedettes.length > 1 ? 's' : ''} proposent leurs produits en ligne
                </p>
              </div>
            </div>

            {/* Grille vedettes */}
            <div className={`grid ${gridCols} gap-3 md:gap-4`}>
              {vedettes.map((structure, index) => (
                <CarteBoutiqueVedette
                  key={structure.id_structure}
                  structure={structure}
                  index={index}
                  onClick={handleBoutiqueClick}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* Separateur */}
        <div className="border-t border-white/10 my-6" />

        {/* ============================================ */}
        {/* 4. SECTION : TOUTES LES BOUTIQUES            */}
        {/* ============================================ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {/* Titre + filtres */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-white font-semibold text-sm md:text-base mb-1">
                  Toutes les boutiques
                </h2>
                <p className="text-white/40 text-xs">
                  {structuresData.total_structures} marchand{structuresData.total_structures > 1 ? 's' : ''} inscrits sur FayClick
                </p>
              </div>
            </div>

            {/* Chips filtres par type */}
            <TypeStructureChips
              selected={typeFiltre}
              onChange={setTypeFiltre}
              counts={countsByType}
            />
          </div>

          {/* Grille toutes les boutiques */}
          {boutiquesVisibles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10"
            >
              <Store className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white mb-2">Aucune boutique trouvee</h3>
              <p className="text-white/40 text-sm">
                Aucune boutique de ce type pour le moment
              </p>
            </motion.div>
          ) : (
            <>
              <div className={`grid ${gridCols} gap-3 md:gap-4 mb-6`}>
                {boutiquesVisibles.map((structure, index) => (
                  <CarteBoutiqueStandard
                    key={structure.id_structure}
                    structure={structure}
                    index={index}
                    onClick={handleBoutiqueClick}
                  />
                ))}
              </div>

              {/* Bouton "Charger plus" */}
              {hasMore && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 24)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white transition-all"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Afficher plus ({remaining > 0 ? remaining : 0} restante{remaining > 1 ? 's' : ''})
                  </button>
                </div>
              )}
            </>
          )}
        </motion.section>

        {/* Footer spacer */}
        <div className="h-8" />
      </motion.div>

      {/* Sticky search mobile */}
      <StickySearchNav />

      {/* Bottom Navigation Mobile */}
      <BottomNavMarketplace
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
          if (tab === 'boutiques') {
            document.getElementById('boutiques-vedettes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          if (tab === 'search') {
            // Focus sur la barre de recherche en haut
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      />
    </div>
  );
}
