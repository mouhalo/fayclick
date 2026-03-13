/**
 * Composant client pour la marketplace globale FayClick
 * Redesign avec hero, carrousel boutiques, recherche intelligente, panier multi-structure
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Filter, AlertCircle } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cataloguesPublicService } from '@/services/catalogues-public.service';
import { marketplaceSearchService } from '@/services/marketplace-search.service';
import { CataloguesGlobalResponse, ProduitPublicGlobal } from '@/types/catalogues';
import { StructurePublique, MarketplaceStats } from '@/types/marketplace';
import { ArticlePanier } from '@/services/online-seller.service';
import CarteProduit from './CarteProduit';
import PanierPublic from './PanierPublic';
import MarketplaceHero from '@/components/marketplace/MarketplaceHero';
import BoutiquesCarousel from '@/components/marketplace/BoutiquesCarousel';
import StickySearchNav from '@/components/marketplace/StickySearchNav';
import MarketplaceFAB from '@/components/marketplace/MarketplaceFAB';
import BoutiqueFAB from '@/components/marketplace/BoutiqueFAB';
import ToastPanier from '@/components/marketplace/ToastPanier';
import { SkeletonCarteProduit } from '@/components/marketplace/SkeletonCards';
import { formatNomCategorie } from '@/lib/format-categorie';
import Pagination from '@/components/marketplace/Pagination';
import BottomNavMarketplace from '@/components/marketplace/BottomNavMarketplace';
import CategoryChips from '@/components/marketplace/CategoryChips';
import SortDropdown, { SortOption } from '@/components/marketplace/SortDropdown';
import DesktopSidebar from '@/components/marketplace/DesktopSidebar';
import MarketplaceNavbar from '@/components/marketplace/MarketplaceNavbar';

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
  const [sortOption, setSortOption] = useState<SortOption>('pertinence');
  const [prixMax, setPrixMax] = useState(100000);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Panier marketplace
  const [panier, setPanier] = useState<ArticlePanier[]>([]);
  const [panierOuvert, setPanierOuvert] = useState(false);
  const [panierStructureId, setPanierStructureId] = useState<number | null>(null);
  const [panierStructureNom, setPanierStructureNom] = useState('');

  // Toast
  const [toast, setToast] = useState<{ nom: string; photo?: string } | null>(null);
  const [toastWarning, setToastWarning] = useState(false);

  // Bottom nav
  const [activeTab, setActiveTab] = useState<'home' | 'boutiques' | 'cart' | 'profil'>('home');

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

  // Filtrer et trier les produits
  const produitsFiltres = useMemo(() => {
    if (!catalogue?.data) return [];
    let filtered = [...catalogue.data];
    if (categorieFiltre) {
      filtered = filtered.filter(p => p.nom_categorie === categorieFiltre);
    }
    // Filtre prix
    if (prixMax < 100000) {
      filtered = filtered.filter(p => p.prix_vente <= prixMax);
    }
    // Tri
    switch (sortOption) {
      case 'prix_asc':
        filtered.sort((a, b) => a.prix_vente - b.prix_vente);
        break;
      case 'prix_desc':
        filtered.sort((a, b) => b.prix_vente - a.prix_vente);
        break;
      case 'nom_az':
        filtered.sort((a, b) => a.nom_produit.localeCompare(b.nom_produit, 'fr'));
        break;
    }
    return filtered;
  }, [catalogue, categorieFiltre, sortOption, prixMax]);

  // Pagination
  const totalPages = Math.ceil(produitsFiltres.length / ITEMS_PER_PAGE);
  const produitsVisibles = produitsFiltres.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Categories uniques
  const categories = useMemo(() => {
    if (!catalogue?.data) return [];
    const unique = new Set(catalogue.data.map(p => p.nom_categorie).filter(Boolean));
    return Array.from(unique).sort();
  }, [catalogue]);

  // Compteurs par categorie (pour sidebar desktop)
  const totalByCategorie = useMemo(() => {
    if (!catalogue?.data) return {};
    const counts: Record<string, number> = {};
    catalogue.data.forEach(p => {
      if (p.nom_categorie) counts[p.nom_categorie] = (counts[p.nom_categorie] || 0) + 1;
    });
    return counts;
  }, [catalogue]);

  // Reset page quand filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [categorieFiltre, prixMax]);

  // Fonctions panier — contrainte 1 structure
  const ajouterAuPanier = useCallback((produit: ProduitPublicGlobal) => {
    // Verifier contrainte 1 structure
    if (panierStructureId && panierStructureId !== produit.id_structure) {
      setToastWarning(true);
      setTimeout(() => setToastWarning(false), 3000);
      return;
    }

    // Mettre a jour structure du panier
    if (!panierStructureId) {
      setPanierStructureId(produit.id_structure);
      setPanierStructureNom(produit.nom_structure || '');
    }

    setToast({ nom: produit.nom_produit, photo: produit.photos?.[0]?.url_photo });

    setPanier(prev => {
      const existe = prev.find(a => a.id_produit === produit.id_produit);
      if (existe) {
        if (existe.quantite >= produit.stock_disponible) return prev;
        return prev.map(a =>
          a.id_produit === produit.id_produit
            ? { ...a, quantite: a.quantite + 1 }
            : a
        );
      }
      return [...prev, {
        id_produit: produit.id_produit,
        nom_produit: produit.nom_produit,
        prix_vente: produit.prix_vente,
        quantite: 1,
        stock_disponible: produit.stock_disponible,
        photo_url: produit.photos?.[0]?.url_photo
      }];
    });
  }, [panierStructureId]);

  const modifierQuantite = useCallback((id_produit: number, delta: number) => {
    setPanier(prev => {
      return prev
        .map(a => {
          if (a.id_produit !== id_produit) return a;
          const newQty = a.quantite + delta;
          if (newQty <= 0) return null;
          if (newQty > a.stock_disponible) return a;
          return { ...a, quantite: newQty };
        })
        .filter(Boolean) as ArticlePanier[];
    });
  }, []);

  const supprimerDuPanier = useCallback((id_produit: number) => {
    setPanier(prev => {
      const next = prev.filter(a => a.id_produit !== id_produit);
      if (next.length === 0) {
        setPanierStructureId(null);
        setPanierStructureNom('');
      }
      return next;
    });
  }, []);

  const nbArticlesPanier = panier.reduce((sum, a) => sum + a.quantite, 0);

  // Styles responsifs — 3 colonnes mobile, 4 desktop, 5 xl
  const gridCols = isMobile ? 'grid-cols-2 xs:grid-cols-3' : isMobileLarge ? 'grid-cols-3' : 'grid-cols-3 xl:grid-cols-4';

  // Chargement
  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900">
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-6">
          <div className="animate-pulse rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 p-8 mb-6">
            <div className="w-16 h-16 bg-gray-300/20 rounded-full mx-auto mb-3" />
            <div className="h-6 bg-gray-300/20 rounded w-48 mx-auto mb-2" />
            <div className="h-4 bg-gray-300/20 rounded w-64 mx-auto mb-5" />
            <div className="h-12 bg-gray-300/20 rounded-full max-w-xl mx-auto" />
          </div>
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
        {/* 0. Navbar desktop Stitch */}
        <MarketplaceNavbar
          cartCount={nbArticlesPanier}
          onCartClick={() => { if (nbArticlesPanier > 0) setPanierOuvert(true); }}
        />

        {/* Layout Desktop: [Sidebar | MainContent] */}
        <div className="flex gap-6">
          {/* Sidebar filtres desktop — alignee avec hero */}
          <DesktopSidebar
            categories={categories}
            selectedCategorie={categorieFiltre}
            onCategorieChange={setCategorieFiltre}
            totalByCategorie={totalByCategorie}
            onPriceFilter={(_min, max) => setPrixMax(max)}
          />

          {/* Contenu principal */}
          <div className="flex-1 min-w-0">
            {/* 1. Hero avec recherche */}
            <MarketplaceHero stats={stats} />

            {/* 2. Carrousel boutiques */}
            <BoutiquesCarousel structures={structures} />

            {/* 3. Section Produits en vedette + filtres */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-4 space-y-3"
              id="products-grid"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-semibold text-sm md:text-base">
                    Produits en vedette
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                    Nouveautes
                  </span>
                </div>
                <SortDropdown value={sortOption} onChange={setSortOption} />
              </div>

              {/* Chips categories horizontales — mobile/tablette */}
              <div className="lg:hidden">
                {categories.length > 0 && (
                  <CategoryChips
                    categories={categories}
                    selected={categorieFiltre}
                    onChange={setCategorieFiltre}
                  />
                )}
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
                      onAcheter={(p) => ajouterAuPanier(p as ProduitPublicGlobal)}
                    />
                  ))}
                </motion.div>

                {/* 5. Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                />
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* 6. Sticky search + FABs */}
      <StickySearchNav />

      {/* FAB Panier - visible uniquement desktop (BottomNav sur mobile) */}
      <div className="hidden lg:block">
        {!panierOuvert && (
          <BoutiqueFAB nbArticles={nbArticlesPanier} onClick={() => setPanierOuvert(true)} />
        )}
        {nbArticlesPanier === 0 && !panierOuvert && <MarketplaceFAB />}
      </div>

      {/* Toast ajout panier */}
      <ToastPanier
        visible={!!toast}
        nomProduit={toast?.nom || ''}
        photoUrl={toast?.photo}
        onHide={() => setToast(null)}
      />

      {/* Toast warning structure differente */}
      <AnimatePresence>
        {toastWarning && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9998] px-4 py-3 rounded-2xl bg-orange-500/90 backdrop-blur-xl border border-orange-300/30 shadow-2xl"
          >
            <p className="text-white text-sm font-medium text-center">
              Votre panier contient des articles de <span className="font-bold">{panierStructureNom}</span>.
              <br />
              <span className="text-white/70 text-xs">Videz le panier pour acheter ailleurs.</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Mobile */}
      <BottomNavMarketplace
        activeTab={activeTab}
        cartCount={nbArticlesPanier}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'cart' && nbArticlesPanier > 0) setPanierOuvert(true);
          if (tab === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* 7. Drawer Panier */}
      <AnimatePresence>
        {panierOuvert && panierStructureId && (
          <PanierPublic
            isOpen={panierOuvert}
            onClose={() => setPanierOuvert(false)}
            articles={panier}
            onModifierQuantite={modifierQuantite}
            onSupprimer={supprimerDuPanier}
            idStructure={panierStructureId}
            nomStructure={panierStructureNom}
            onPaymentSuccess={() => {
              setPanier([]);
              setPanierStructureId(null);
              setPanierStructureNom('');
              loadData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
