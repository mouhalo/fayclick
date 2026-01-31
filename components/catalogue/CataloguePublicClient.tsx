/**
 * Composant client pour l'affichage du catalogue public d'une structure
 * Design harmonisé avec le catalogue global - Thème vert glassmorphism
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  AlertCircle,
  Loader,
  ChevronLeft,
  ChevronRight,
  Package,
  ChevronDown,
  ChevronUp,
  ShoppingCart
} from 'lucide-react';
import Image from 'next/image';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cataloguePublicService } from '@/services/catalogue-public.service';
import { CatalogueResponse, ProduitPublic, FiltresCatalogue } from '@/types/catalogue';
import CarteProduit from './CarteProduit';
import PanierPublic from './PanierPublic';
import { ArticlePanier } from '@/services/online-seller.service';

interface CataloguePublicClientProps {
  nomStructure?: string;
  idStructure?: number;
}

export default function CataloguePublicClient({ nomStructure, idStructure }: CataloguePublicClientProps) {
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

  // Panier
  const [panier, setPanier] = useState<ArticlePanier[]>([]);
  const [panierOuvert, setPanierOuvert] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Charger le catalogue
  const loadCatalogue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🛒 Chargement catalogue pour:', idStructure || nomStructure);

      const catalogueData = idStructure
        ? await cataloguePublicService.getProduitsPublicsById(idStructure)
        : await cataloguePublicService.getProduitsPublics(nomStructure!);

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
        card: 'p-4',
        title: 'text-lg',
        subtitle: 'text-sm',
        grid: 'grid-cols-2'  // 2 colonnes sur mobile
      };
    } else if (isMobileLarge) {
      return {
        container: 'px-4 py-5',
        card: 'p-5',
        title: 'text-xl',
        subtitle: 'text-base',
        grid: 'grid-cols-2'
      };
    } else {
      return {
        container: 'px-6 py-6',
        card: 'p-6',
        title: 'text-2xl',
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background premium avec effet de morphing dynamique - Thème vert FayClick */}
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
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0"
        />
        {/* Overlay pour adoucir */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`max-w-7xl mx-auto relative z-10 ${styles.container}`}
      >
        {/* Header Premium avec Logo Structure et Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className={`relative overflow-hidden rounded-3xl shadow-2xl ${styles.card} mb-6`}
        >
          {/* Background glassmorphe premium */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-2xl" />

          {/* Effet de réflexion */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

          {/* Effet prismatique animé - Vert FayClick */}
          <motion.div
            animate={{
              background: [
                'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
                'linear-gradient(135deg, transparent 0%, rgba(20, 184, 166, 0.15) 50%)',
                'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, transparent 50%)'
              ]
            }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute inset-0 pointer-events-none"
          />

          {/* Bordure lumineuse */}
          <div className="absolute inset-0 rounded-3xl border border-white/30 shadow-inner" />

          <div className="text-center relative z-10">
            {/* Logo Structure - Inspiré de la page login */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                damping: 15,
                stiffness: 200,
                delay: 0.2
              }}
              className="inline-flex items-center justify-center mb-4"
            >
              {catalogue.logo ? (
                <div className="relative">
                  <Image
                    src={catalogue.logo}
                    alt={`Logo ${catalogue.nom_structure}`}
                    width={isMobile ? 80 : 120}
                    height={isMobile ? 80 : 120}
                    className="object-contain rounded-2xl"
                  />
                </div>
              ) : (
                <div className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24 md:w-28 md:h-28'} flex items-center justify-center bg-white/20 backdrop-blur-xl rounded-2xl border border-white/40`}>
                  <Package className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14'} text-emerald-300`} />
                </div>
              )}
            </motion.div>

            {/* Titre Structure */}
            <motion.h2
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={`${isMobile ? 'text-xl' : 'text-2xl md:text-3xl'} font-bold text-white drop-shadow-lg mb-1`}
            >
              {catalogue.nom_structure}
            </motion.h2>

            {/* Sous-titre */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`${isMobile ? 'text-sm' : 'text-base md:text-lg'} text-emerald-100 drop-shadow mb-4`}
            >
              Catalogue de produits et services
            </motion.p>

            {/* Badge total produits + badge panier */}
            <div className="flex items-center justify-center gap-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-400/30"
              >
                <Package className="w-4 h-4 text-emerald-200" />
                <span className="font-bold text-emerald-100 text-sm">
                  {catalogue.total_produits} produit{catalogue.total_produits > 1 ? 's' : ''}
                </span>
              </motion.div>

              {nbArticlesPanier > 0 && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPanierOuvert(true)}
                  className="relative inline-flex items-center gap-2 px-4 py-2 bg-orange-500/80 backdrop-blur-sm rounded-full border border-orange-400/50 hover:bg-orange-500 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4 text-white" />
                  <span className="font-bold text-white text-sm">{nbArticlesPanier}</span>
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Zone de recherche et filtres dépliable - Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`relative overflow-hidden rounded-2xl shadow-xl border border-white/20 ${styles.card} mb-6`}
        >
          {/* Background glassmorphe */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-2xl" />

          {/* Effet de réflexion */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 space-y-4">
            {/* Header avec bouton toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-emerald-500/20 backdrop-blur-sm rounded-lg border border-emerald-400/30">
                  <Search className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h2 className="font-semibold text-white text-sm md:text-base">Recherche & Filtres</h2>
                  <p className="text-xs text-emerald-200">
                    {produitsFiltres.length} résultat{produitsFiltres.length > 1 ? 's' : ''}
                    {(filtres.searchTerm || filtres.categorie) && ` sur ${catalogue.total_produits}`}
                  </p>
                </div>
              </div>

              {/* Bouton toggle */}
              <motion.button
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg border border-white/20 transition-colors"
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
                      <ChevronUp className="w-5 h-5 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="down"
                      initial={{ rotate: -180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 180, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-white" />
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
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    {/* Recherche produit - Glassmorphe Vert */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300" />
                      <input
                        type="text"
                        placeholder="Rechercher un produit..."
                        value={filtres.searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all text-white placeholder-emerald-200/60"
                      />
                    </div>

                    {/* Filtre catégorie - Glassmorphe Vert */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-300" />
                        <select
                          value={filtres.categorie}
                          onChange={(e) => handleCategorieChange(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-green-400/50 focus:border-green-400/50 transition-all appearance-none text-white"
                        >
                          <option value="" className="bg-slate-800">Toutes les catégories</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Bouton reset - Glassmorphe */}
                      {(filtres.searchTerm || filtres.categorie) && (
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={resetFiltres}
                          className="px-3 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm border border-red-400/30 text-red-100 rounded-lg transition-all font-medium whitespace-nowrap"
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

        {/* Grille de produits avec animation d'apparition */}
        {produitsPage.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white/10 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/20"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Package className="w-16 h-16 md:w-20 md:h-20 text-emerald-300 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
              Aucun produit trouvé
            </h3>
            <p className="text-emerald-200 text-sm md:text-base">
              {filtres.searchTerm || filtres.categorie
                ? 'Essayez de modifier vos critères de recherche'
                : 'Cette structure n\'a pas encore de produits dans son catalogue'
              }
            </p>
          </motion.div>
        ) : (
          <>
            {/* Grille de produits - 2 colonnes sur mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className={`grid ${styles.grid} gap-3 md:gap-6 mb-6`}
            >
              {produitsPage.map((produit, index) => (
                <CarteProduit
                  key={produit.id_produit}
                  produit={produit}
                  index={index}
                  showStructureName={false}
                  onAcheter={(p) => ajouterAuPanier(p as ProduitPublic)}
                />
              ))}
            </motion.div>

            {/* Pagination - Glassmorphe */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-3 md:gap-4 py-6"
              >
                <motion.button
                  whileHover={{ scale: 1.1, x: -5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 md:p-3 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </motion.button>

                <div className="px-4 md:px-6 py-2 md:py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
                  <span className="text-sm md:text-base font-bold text-white">
                    Page {currentPage} / {totalPages}
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1, x: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 md:p-3 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </motion.button>
              </motion.div>
            )}
          </>
        )}
      </motion.div>

      {/* Bouton flottant panier */}
      {nbArticlesPanier > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setPanierOuvert(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-lg flex items-center justify-center"
        >
          <ShoppingCart className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {nbArticlesPanier}
          </span>
        </motion.button>
      )}

      {/* Drawer Panier */}
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
