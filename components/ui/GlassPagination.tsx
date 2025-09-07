/**
 * Composant de pagination avec design glassmorphism
 * Mobile-first avec navigation Previous/Next + numéros de page
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';

interface GlassPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems: number;
  className?: string;
}

export function GlassPagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 10,
  totalItems,
  className
}: GlassPaginationProps) {
  
  // Calcul des numéros de page à afficher
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5; // Maximum de pages visibles sur mobile
    
    if (totalPages <= maxVisiblePages) {
      // Afficher toutes les pages si peu de pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logique complexe pour grandes listes
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages, currentPage + 1);
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [currentPage, totalPages]);

  // Calcul des infos d'affichage
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number | string) => {
    if (typeof page === 'number') {
      onPageChange(page);
    }
  };

  // Afficher seulement les informations si une seule page
  if (totalPages <= 1) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn("", className)}
      >
        <GlassCard className="p-3">
          <div className="text-center">
            <p className="text-emerald-100 text-sm font-medium">
              Affichage de {totalItems} facture{totalItems > 1 ? 's' : ''}
            </p>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("space-y-2", className)}
    >
      {/* Contrôles de pagination et informations combinés */}
      <GlassCard className="p-3 space-y-3">
        {/* Informations de pagination */}
        <div className="text-center">
          <p className="text-emerald-100 text-xs font-medium">
            Affichage de {startItem} à {endItem} sur {totalItems} factures
          </p>
        </div>
        
        {/* Contrôles de navigation */}
        <div className="flex items-center justify-between space-x-2">
          {/* Bouton Previous */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className={cn(
              'flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium',
              'bg-white/10 border border-white/20 transition-all duration-200',
              currentPage === 1
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-white/20 hover:scale-105 active:scale-95'
            )}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
            <span className="hidden sm:inline text-white">Précédent</span>
          </motion.button>

          {/* Numéros de page */}
          <div className="flex items-center space-x-1">
            {pageNumbers.map((page, index) => (
              <motion.div
                key={`${page}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                {page === '...' ? (
                  <div className="px-2 py-1">
                    <MoreHorizontal className="w-4 h-4 text-emerald-200" />
                  </div>
                ) : (
                  <button
                    onClick={() => handlePageClick(page)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200',
                      'border border-white/20',
                      page === currentPage
                        ? 'bg-white/30 text-white border-white/40 shadow-lg'
                        : 'bg-white/10 text-emerald-100 hover:bg-white/20 hover:text-white hover:scale-105'
                    )}
                  >
                    {page}
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          {/* Bouton Next */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className={cn(
              'flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium',
              'bg-white/10 border border-white/20 transition-all duration-200',
              currentPage === totalPages
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-white/20 hover:scale-105 active:scale-95'
            )}
          >
            <span className="hidden sm:inline text-white">Suivant</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Hook utilitaire pour la pagination (optionnel)
export function usePagination(totalItems: number, itemsPerPage: number = 10) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const getPaginatedItems = <T,>(items: T[], currentPage: number): T[] => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  return {
    totalPages,
    getPaginatedItems,
    itemsPerPage
  };
}