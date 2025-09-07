/**
 * Hook useListPage<T>
 * Gestion d'état réutilisable pour les pages de listes
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useListPagination } from '@/components/ui/ListPagination';

export interface UseListPageOptions<T, F> {
  loadItems: () => Promise<T[]>;
  filterItems: (items: T[], filters: F) => T[];
  itemsPerPage?: number;
  initialFilters?: F;
  autoLoad?: boolean;
}

export interface UseListPageReturn<T, F> {
  // États
  items: T[];
  filteredItems: T[];
  paginatedItems: T[];
  loading: boolean;
  error: string;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
  
  // Filtres
  filters: F;
  
  // Actions
  loadItems: () => Promise<void>;
  setFilters: (filters: F) => void;
  setCurrentPage: (page: number) => void;
  refresh: () => Promise<void>;
  
  // États calculés
  isEmpty: boolean;
  hasNoResults: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
}

export function useListPage<T, F>({
  loadItems: loadItemsCallback,
  filterItems,
  itemsPerPage = 10,
  initialFilters,
  autoLoad = true
}: UseListPageOptions<T, F>): UseListPageReturn<T, F> {

  // États principaux
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filters, setFilters] = useState<F>(initialFilters as F);
  const [currentPage, setCurrentPage] = useState(1);

  // Chargement des données
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await loadItemsCallback();
      setItems(data);
      
    } catch (err: any) {
      console.error('Erreur chargement des données:', err);
      setError(err.message || 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  }, [loadItemsCallback]);

  // Fonction de refresh
  const refresh = useCallback(async () => {
    await loadItems();
  }, [loadItems]);

  // Filtrage des éléments
  const filteredItems = useMemo(() => {
    if (!items.length) return [];
    if (!filters) return items;
    
    return filterItems(items, filters);
  }, [items, filters, filterItems]);

  // Pagination
  const { 
    totalPages, 
    getPaginatedData, 
    totalItems: filteredCount 
  } = useListPagination(filteredItems, itemsPerPage);

  const paginatedItems = useMemo(() => {
    return getPaginatedData(currentPage);
  }, [getPaginatedData, currentPage]);

  // Gestion des filtres avec reset de pagination
  const handleSetFilters = useCallback((newFilters: F) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset à la première page quand on filtre
  }, []);

  // Chargement initial
  useEffect(() => {
    if (autoLoad) {
      loadItems();
    }
  }, [loadItems, autoLoad]);

  // États calculés
  const isEmpty = !loading && items.length === 0;
  const hasNoResults = !loading && items.length > 0 && filteredItems.length === 0;
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return {
    // États
    items,
    filteredItems,
    paginatedItems,
    loading,
    error,
    
    // Pagination
    currentPage,
    totalPages,
    totalItems: filteredCount,
    
    // Filtres
    filters,
    
    // Actions
    loadItems,
    setFilters: handleSetFilters,
    setCurrentPage,
    refresh,
    
    // États calculés
    isEmpty,
    hasNoResults,
    isFirstPage,
    isLastPage
  };
}

// Hook simplifié pour les listes sans filtrage
export function useSimpleListPage<T>(
  loadItems: () => Promise<T[]>,
  itemsPerPage: number = 10
) {
  return useListPage<T, {}>({
    loadItems,
    filterItems: (items) => items, // Pas de filtrage
    itemsPerPage,
    initialFilters: {} as {},
  });
}