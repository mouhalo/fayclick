/**
 * Composant client pour l'affichage du catalogue public d'une structure
 * Redesign Venezo avec header boutique, recherche inline, FAB panier
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Loader, AlertCircle } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cataloguePublicService } from '@/services/catalogue-public.service';
import { CatalogueResponse, ProduitPublic } from '@/types/catalogue';
import CarteProduit from './CarteProduit';
import PanierPublic from './PanierPublic';
import { ArticlePanier } from '@/services/online-seller.service';
import BoutiqueHeader from '@/components/marketplace/BoutiqueHeader';
import BoutiqueSearchFilter from '@/components/marketplace/BoutiqueSearchFilter';
import BoutiqueFAB from '@/components/marketplace/BoutiqueFAB';
import MarketplaceFAB from '@/components/marketplace/MarketplaceFAB';
import { SkeletonCarteProduit } from '@/components/marketplace/SkeletonCards';

interface CataloguePublicClientProps {
  nomStructure?: string;
  idStructure?: number;
}

export default function CataloguePublicClient({ nomStructure, idStructure }: CataloguePublicClientProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();

  // Etats principaux
  const [catalogue, setCatalogue] = useState<CatalogueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [categorie, setCategorie] = useState('');

  // Panier
  const [panier, setPanier] = useState<ArticlePanier[]>([]);
  const [panierOuvert, setPanierOuvert] = useState(false);

  // Pagination charger plus
  const [visibleCount, setVisibleCount] = useState(12);

  // Charger le catalogue
  const loadCatalogue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const catalogueData = idStructure
        ? await cataloguePublicService.getProduitsPublicsById(idStructure)
        : await cataloguePublicService.getProduitsPublics(nomStructure!);

      if (!catalogueData) {
        throw new Error('Catalogue introuvable');
      }

      setCatalogue(catalogueData as CatalogueResponse);
    } catch (err: unknown) {
      console.error('Erreur chargement catalogue:', err);
      setError(err instanceof Error ? err.message : 'Impossible de charger le catalogue');
    } finally {
      setLoading(false);
    }
  }, [nomStructure, idStructure]);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  // Filtrer les produits
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
    return filtered;
  }, [catalogue, searchTerm, categorie]);

  // Produits visibles
  const produitsVisibles = produitsFiltres.slice(0, visibleCount);
  const hasMore = visibleCount < produitsFiltres.length;

  // Categories uniques
  const categories = useMemo(() => {
    if (!catalogue?.data) return [];
    const unique = new Set(catalogue.data.map(p => p.nom_categorie).filter(Boolean));
    return Array.from(unique).sort();
  }, [catalogue]);

  // Reset visible count quand filtres changent
  useEffect(() => {
    setVisibleCount(12);
  }, [searchTerm, categorie]);

  // Fonctions panier
  const ajouterAuPanier = useCallback((produit: ProduitPublic) => {
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
        stock_disponible: produit.stock_disponible
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
  const gridCols = isMobile ? 'grid-cols-3' : isMobileLarge ? 'grid-cols-3' : 'grid-cols-4 xl:grid-cols-5';

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
        {/* 1. Header boutique */}
        <BoutiqueHeader catalogue={catalogue} totalCategories={categories.length} />

        {/* 2. Recherche + filtres inline */}
        <BoutiqueSearchFilter
          searchTerm={searchTerm}
          categorie={categorie}
          categories={categories}
          totalResultats={produitsFiltres.length}
          totalProduits={catalogue.total_produits}
          onSearchChange={setSearchTerm}
          onCategorieChange={setCategorie}
          onReset={resetFiltres}
        />

        {/* 3. Grille produits */}
        {produitsVisibles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white/10 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/20"
          >
            <Package className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Aucun produit trouve</h3>
            <p className="text-emerald-200 text-sm">
              {searchTerm || categorie
                ? 'Essayez de modifier vos criteres de recherche'
                : "Cette boutique n'a pas encore de produits"
              }
            </p>
          </motion.div>
        ) : (
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

            {/* 4. Charger plus */}
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

      {/* 5. FAB panier */}
      <BoutiqueFAB nbArticles={nbArticlesPanier} onClick={() => setPanierOuvert(true)} />

      {/* Scroll top FAB (quand pas d'articles dans le panier) */}
      {nbArticlesPanier === 0 && <MarketplaceFAB />}

      {/* 6. Drawer Panier - INCHANGE */}
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
