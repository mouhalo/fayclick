/**
 * Composant ListPagination standardisé
 * Extension de GlassPagination avec logique intégrée
 */

'use client';

import { GlassPagination, usePagination } from './GlassPagination';

interface ListPaginationProps {
  totalItems: number;
  currentPage: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  className?: string;
  showOnSinglePage?: boolean;
}

export function ListPagination({
  totalItems,
  currentPage,
  itemsPerPage = 10,
  onPageChange,
  className,
  showOnSinglePage = false
}: ListPaginationProps) {
  const { totalPages } = usePagination(totalItems, itemsPerPage);

  // Ne pas afficher la pagination s'il n'y a qu'une page (sauf si explicitement demandé)
  if (!showOnSinglePage && totalPages <= 1) {
    return null;
  }

  return (
    <GlassPagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      onPageChange={onPageChange}
      className={className}
    />
  );
}

// Hook personnalisé pour la pagination des listes
export function useListPagination<T>(
  items: T[], 
  itemsPerPage: number = 10
) {
  const { getPaginatedItems, totalPages } = usePagination(items.length, itemsPerPage);

  const getPaginatedData = (currentPage: number): T[] => {
    return getPaginatedItems(items, currentPage);
  };

  return {
    totalPages,
    getPaginatedData,
    itemsPerPage,
    totalItems: items.length
  };
}