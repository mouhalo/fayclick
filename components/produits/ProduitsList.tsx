/**
 * Composant ProduitsList - Liste adaptée aux produits
 * Extension d'ItemsList avec support du viewMode grid/list
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus } from 'lucide-react';
import { ItemsList } from '@/components/ui/ItemsList';
import { Produit } from '@/types/produit';

interface ProduitsListProps {
  items: Produit[];
  loading?: boolean;
  viewMode: 'grid' | 'list' | 'compact';
  renderItem: (item: Produit, index: number) => React.ReactNode;
  renderSkeleton?: (index: number) => React.ReactNode;
  onAddProduit: () => void;
  onClearFilters?: () => void;
  isEmpty?: boolean;
  hasNoResults?: boolean;
  searchTerm?: string;
  hasFilters?: boolean;
  skeletonCount?: number;
}

export function ProduitsList({
  items,
  loading = false,
  viewMode,
  renderItem,
  renderSkeleton,
  onAddProduit,
  onClearFilters,
  isEmpty = false,
  hasNoResults = false,
  searchTerm = '',
  hasFilters = false,
  skeletonCount = 6
}: ProduitsListProps) {

  // Classes de grille selon le mode de vue
  const getGridClassName = () => {
    switch (viewMode) {
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4';
      case 'compact':
        // Vue compacte : 2 colonnes mobile, 3 tablet, 4 desktop
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3';
      case 'list':
        return 'grid grid-cols-1 gap-4';
      default:
        return 'grid grid-cols-1 gap-4';
    }
  };

  const gridClassName = getGridClassName();

  // Si chargement, affichage des skeletons
  if (loading) {
    return (
      <div className={gridClassName}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          renderSkeleton ? renderSkeleton(i) : <div key={i} />
        ))}
      </div>
    );
  }

  // État vide (aucun produit du tout)
  if (isEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
          <Package className="w-10 h-10 text-white/60" />
        </div>
        
        <h3 className="text-lg font-semibold text-white/80 mb-2">
          Aucun produit enregistré
        </h3>
        
        <p className="text-emerald-100/70 text-sm mb-6">
          Commencez par ajouter vos premiers produits
        </p>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddProduit}
          className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 hover:bg-white/30 transition-colors flex items-center gap-2 mx-auto"
        >
          <Plus className="w-4 h-4" />
          Ajouter un produit
        </motion.button>
      </motion.div>
    );
  }

  // Aucun résultat de filtre
  if (hasNoResults) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
          <Package className="w-8 h-8 text-white/60" />
        </div>
        
        <h3 className="text-lg font-semibold text-white/80 mb-2">
          Aucun produit trouvé
        </h3>
        
        <p className="text-emerald-100/70 text-sm mb-6">
          Aucun produit ne correspond à vos critères de recherche
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {(searchTerm || hasFilters) && onClearFilters && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClearFilters}
              className="px-4 py-2 border border-white/30 text-white/80 rounded-lg hover:bg-white/10 transition-colors"
            >
              Effacer les filtres
            </motion.button>
          )}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAddProduit}
            className="px-6 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg border border-white/30 hover:bg-white/30 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un produit
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Affichage des produits avec animations stagger
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={gridClassName}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={`produit-${item.id_produit}`}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ 
              delay: index * 0.05,
              type: "spring" as const,
              stiffness: 100,
              damping: 12
            }}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
