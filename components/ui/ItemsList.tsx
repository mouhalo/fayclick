/**
 * Composant générique ItemsList<T>
 * Liste réutilisable avec animations stagger et gestion des états
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface ItemsListProps<T> {
  items: T[];
  loading?: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderSkeleton?: (index: number) => React.ReactNode;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  noResultsIcon?: React.ComponentType<{ className?: string }>;
  noResultsTitle?: string;
  noResultsMessage?: string;
  skeletonCount?: number;
  showNoResults?: boolean;
  className?: string;
  itemClassName?: string;
}

// Variants pour le container avec stagger
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

// Variants pour les items individuels
const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.9,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    y: -20,
    transition: {
      duration: 0.2
    }
  },
};

// Skeleton par défaut
const DefaultSkeleton = ({ index }: { index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="animate-pulse"
  >
    <div className="backdrop-blur-lg bg-white/20 border border-white/30 rounded-xl p-4">
      <div className="flex justify-between mb-3">
        <div>
          <div className="h-5 bg-white/20 rounded w-32 mb-2"></div>
          <div className="h-4 bg-white/15 rounded w-24"></div>
        </div>
        <div className="h-6 bg-white/20 rounded-full w-16"></div>
      </div>
      
      <div className="mb-4">
        <div className="h-4 bg-white/15 rounded w-28 mb-1"></div>
        <div className="h-4 bg-white/15 rounded w-24"></div>
      </div>
      
      <div className="text-center mb-4">
        <div className="h-8 bg-white/20 rounded w-40 mx-auto"></div>
      </div>
      
      <div className="flex space-x-2">
        <div className="flex-1 h-10 bg-white/15 rounded-lg"></div>
        <div className="flex-1 h-10 bg-white/15 rounded-lg"></div>
      </div>
    </div>
  </motion.div>
);

export function ItemsList<T>({
  items,
  loading = false,
  renderItem,
  renderSkeleton,
  emptyIcon: EmptyIcon,
  emptyTitle = "Aucun élément trouvé",
  emptyMessage = "Aucun élément n'a été trouvé dans cette liste.",
  emptyAction,
  noResultsIcon: NoResultsIcon,
  noResultsTitle = "Aucun résultat",
  noResultsMessage = "Aucun élément ne correspond à vos critères de recherche.",
  skeletonCount = 5,
  showNoResults = false,
  className = "space-y-4 pb-20",
  itemClassName,
}: ItemsListProps<T>) {

  // État de loading
  if (loading) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={className}
      >
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <motion.div key={index} variants={itemVariants} className={itemClassName}>
            {renderSkeleton ? renderSkeleton(index) : <DefaultSkeleton index={index} />}
          </motion.div>
        ))}
      </motion.div>
    );
  }

  // État: aucun résultat de filtre
  if (showNoResults && items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20"
        >
          {NoResultsIcon ? (
            <NoResultsIcon className="w-8 h-8 text-white/60" />
          ) : (
            <div className="w-8 h-8 rounded bg-white/20" />
          )}
        </motion.div>
        
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg font-semibold text-white/80 mb-2"
        >
          {noResultsTitle}
        </motion.h3>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-emerald-100/70 text-sm"
        >
          {noResultsMessage}
        </motion.p>
      </motion.div>
    );
  }

  // État vide (aucun élément du tout)
  if (!showNoResults && items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-24 h-24 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20"
        >
          {EmptyIcon ? (
            <EmptyIcon className="w-12 h-12 text-white/60" />
          ) : (
            <div className="w-12 h-12 rounded bg-white/20" />
          )}
        </motion.div>
        
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-semibold text-white/80 mb-2"
        >
          {emptyTitle}
        </motion.h3>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-emerald-100/70 text-sm mb-6"
        >
          {emptyMessage}
        </motion.p>
        
        {emptyAction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {emptyAction}
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Liste avec éléments
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={`item-${index}`}
            variants={itemVariants}
            layout
            exit="exit"
            className={itemClassName}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}