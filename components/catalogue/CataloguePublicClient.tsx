/**
 * Composant client pour l'affichage du catalogue public d'une structure
 * Redesign Venezo avec header boutique, recherche inline, FAB panier
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Loader, AlertCircle, Flame } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cataloguePublicService } from '@/services/catalogue-public.service';
import { CatalogueResponse, ProduitPublic } from '@/types/catalogue';
import CarteProduit from './CarteProduit';
import PanierPublic from './PanierPublic';
import { ArticlePanier } from '@/services/online-seller.service';
import BoutiqueHeader from '@/components/marketplace/BoutiqueHeader';
// BoutiqueSearchFilter remplace par recherche inline + chips (Stitch)
import BoutiqueFAB from '@/components/marketplace/BoutiqueFAB';
import MarketplaceFAB from '@/components/marketplace/MarketplaceFAB';
import ToastPanier from '@/components/marketplace/ToastPanier';
import { SkeletonCarteProduit } from '@/components/marketplace/SkeletonCards';
import BottomNavMarketplace from '@/components/marketplace/BottomNavMarketplace';
import SortDropdown, { SortOption } from '@/components/marketplace/SortDropdown';
import Pagination from '@/components/marketplace/Pagination';
import CategoryChips from '@/components/marketplace/CategoryChips';
import DesktopMiniCart from '@/components/marketplace/DesktopMiniCart';
import Breadcrumb from '@/components/marketplace/Breadcrumb';
import MarketplaceNavbar from '@/components/marketplace/MarketplaceNavbar';
import { useTranslations } from '@/hooks/useTranslations';

interface CataloguePublicClientProps {
  nomStructure?: string;
  idStructure?: number;
}

export default function CataloguePublicClient({ nomStructure, idStructure }: CataloguePublicClientProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();
  const t = useTranslations('catalogue');

  // Etats principaux
  const [catalogue, setCatalogue] = useState<CatalogueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [categorie, setCategorie] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('pertinence');
  const [prixMax, setPrixMax] = useState(100000);

  // Panier
  const [panier, setPanier] = useState<ArticlePanier[]>([]);
  const [panierOuvert, setPanierOuvert] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ nom: string; photo?: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Charger le catalogue
  const loadCatalogue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const catalogueData = idStructure
        ? await cataloguePublicService.getProduitsPublicsById(idStructure)
        : await cataloguePublicService.getProduitsPublics(nomStructure!);

      if (!catalogueData) {
        throw new Error(t('errorNotFound'));
      }

      setCatalogue(catalogueData as CatalogueResponse);
    } catch (err: unknown) {
      console.error('Erreur chargement catalogue:', err);
      setError(err instanceof Error ? err.message : t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  }, [nomStructure, idStructure, t]);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  // Filtrer et trier les produits
  const produitsFiltres = useMemo(() => {
    if (!catalogue?.data) return [];
    let filtered = [...catalogue.data];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.nom_produit.toLowerCase().includes(q));
    }
    if (categorie) {
      filtered = filtered.filter(p => p.nom_categorie === categorie);
    }
    if (prixMax < 100000) {
      filtered = filtered.filter(p => p.prix_vente <= prixMax);
    }
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
  }, [catalogue, searchTerm, categorie, sortOption, prixMax]);

  // Séparer promos et normaux
  const produitsPromo = useMemo(() =>
    produitsFiltres.filter(p => p.en_promo === true),
    [produitsFiltres]
  );
  const produitsNormaux = useMemo(() =>
    produitsFiltres.filter(p => p.en_promo !== true),
    [produitsFiltres]
  );

  // Produits visibles (normaux pagines, promos toujours tous affiches)
  const totalPages = Math.ceil(produitsNormaux.length / ITEMS_PER_PAGE);
  const produitsVisibles = produitsNormaux.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Categories uniques
  const categories = useMemo(() => {
    if (!catalogue?.data) return [];
    const unique = new Set(catalogue.data.map(p => p.nom_categorie).filter(Boolean));
    return Array.from(unique).sort();
  }, [catalogue]);

  // Reset page quand filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categorie, prixMax]);

  // Fonctions panier
  const ajouterAuPanier = useCallback((produit: ProduitPublic) => {
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
  }, []);

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
    setPanier(prev => prev.filter(a => a.id_produit !== id_produit));
  }, []);

  const nbArticlesPanier = panier.reduce((sum, a) => sum + a.quantite, 0);

  const resetFiltres = () => {
    setSearchTerm('');
    setCategorie('');
  };

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
            <div className="w-24 h-24 bg-gray-300/20 rounded-2xl mx-auto mb-3" />
            <div className="h-6 bg-gray-300/20 rounded w-48 mx-auto mb-2" />
            <div className="h-4 bg-gray-300/20 rounded w-32 mx-auto" />
          </div>
          <div className={`grid ${gridCols} gap-2 sm:gap-3 md:gap-4`}>
            {Array.from({ length: 6 }).map((_, i) => (
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
          <h1 className="text-xl font-bold text-red-800 mb-2">{t('errorTitle')}</h1>
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

        {/* Breadcrumb desktop */}
        <Breadcrumb items={[{ label: catalogue.nom_structure }]} />

        {/* 1. Header boutique */}
        <BoutiqueHeader catalogue={catalogue} totalCategories={categories.length} />

        {/* 2. Recherche + chips categories inline (style Stitch) */}
        <div className="relative overflow-hidden rounded-2xl shadow-xl border border-white/20 p-3 md:p-4 mb-4">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-2xl" />
          <div className="relative z-10 flex flex-col gap-3">
            {/* Ligne recherche */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-3 py-2.5 text-sm bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all text-white placeholder-white/40"
                />
              </div>
            </div>
            {/* Chips categories inline — desktop Stitch */}
            {categories.length > 0 && (
              <CategoryChips
                categories={categories}
                selected={categorie}
                onChange={setCategorie}
              />
            )}
          </div>
        </div>

        {/* 3. Titre "Nouveautes" + Trier par — Stitch */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-base">{t('newest')}</h2>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs hidden sm:inline">{t('sortBy')}</span>
            <SortDropdown value={sortOption} onChange={setSortOption} />
          </div>
        </div>

        {/* 4. Layout: [Grille | MiniCart] — pas de sidebar (Stitch) */}
        <div className="flex gap-6">
          {/* Contenu principal */}
          <div className="flex-1 min-w-0">
            {/* Section Promotions */}
            {produitsPromo.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/20 backdrop-blur-sm border border-orange-400/30">
                    <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                    <span className="text-sm font-bold text-orange-300">{t('promotions')}</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-500/30 text-[10px] font-bold text-orange-200">
                      {produitsPromo.length}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-orange-400/30 to-transparent" />
                </div>
                <div className={`grid ${gridCols} gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 rounded-xl bg-orange-500/5 border border-orange-400/10`}>
                  {produitsPromo.map((produit, index) => (
                    <CarteProduit
                      key={produit.id_produit}
                      produit={produit}
                      index={index}
                      showStructureName={false}
                      onAcheter={(p) => ajouterAuPanier(p as ProduitPublic)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Grille produits normaux */}
            {produitsVisibles.length === 0 && produitsPromo.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-white/10 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/20"
              >
                <Package className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{t('noProductsFound')}</h3>
                <p className="text-emerald-200 text-sm">
                  {searchTerm || categorie ? t('adjustCriteria') : t('emptyShop')}
                </p>
              </motion.div>
            ) : produitsVisibles.length > 0 ? (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className={`grid ${gridCols} gap-2 sm:gap-3 md:gap-4 mb-6`}
                >
                  {produitsVisibles.map((produit, index) => (
                    <CarteProduit
                      key={produit.id_produit}
                      produit={produit}
                      index={index}
                      showStructureName={false}
                      onAcheter={(p) => ajouterAuPanier(p as ProduitPublic)}
                    />
                  ))}
                </motion.div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </>
            ) : null}
          </div>

          {/* Mini-Cart desktop — toujours visible (Stitch) */}
          <DesktopMiniCart
            articles={panier}
            onOpenDrawer={() => setPanierOuvert(true)}
            onSupprimer={supprimerDuPanier}
            alwaysShow={true}
          />
        </div>
      </motion.div>

      {/* 5. FAB panier — desktop only (BottomNav sur mobile) */}
      <div className="hidden lg:block">
        {!panierOuvert && (
          <BoutiqueFAB nbArticles={nbArticlesPanier} onClick={() => setPanierOuvert(true)} />
        )}
        {nbArticlesPanier === 0 && !panierOuvert && <MarketplaceFAB />}
      </div>

      {/* Bottom Navigation Mobile */}
      <BottomNavMarketplace
        activeTab="home"
        cartCount={nbArticlesPanier}
        onTabChange={(tab) => {
          if (tab === 'cart' && nbArticlesPanier > 0) setPanierOuvert(true);
          if (tab === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
          if (tab === 'history') window.location.href = '/historique';
        }}
      />

      {/* Toast ajout panier */}
      <ToastPanier
        visible={!!toast}
        nomProduit={toast?.nom || ''}
        photoUrl={toast?.photo}
        onHide={() => setToast(null)}
      />

      {/* 6. Drawer Panier */}
      <AnimatePresence>
        {panierOuvert && (
          <PanierPublic
            isOpen={panierOuvert}
            onClose={() => setPanierOuvert(false)}
            articles={panier}
            onModifierQuantite={modifierQuantite}
            onSupprimer={supprimerDuPanier}
            idStructure={idStructure || catalogue.id_structure || 0}
            nomStructure={catalogue.nom_structure}
            onPaymentSuccess={() => {
              setPanier([]);
              loadCatalogue();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
