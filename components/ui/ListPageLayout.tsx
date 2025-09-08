/**
 * Composant ListPageLayout
 * Layout principal réutilisable pour toutes les pages de listes
 */

'use client';

import React from 'react';
import { GlassHeader } from './GlassHeader';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { NoResultsState } from './NoResultsState';
import { ListPagination } from './ListPagination';
import { ItemsList } from './ItemsList';
import { Toast } from './Toast';

interface ListPageLayoutProps<T> {
  // Header
  title: string;
  onBack: () => void;
  showBackButton?: boolean;
  headerRightContent?: React.ReactNode;
  filterContent?: React.ReactNode;

  // Contenu principal
  items: T[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;

  // Rendu des items
  renderItem: (item: T, index: number) => React.ReactNode;
  renderSkeleton?: (index: number) => React.ReactNode;
  skeletonCount?: number;

  // Stats et pagination
  statsContent?: React.ReactNode;
  showPagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;

  // États vides
  isEmpty?: boolean;
  hasNoResults?: boolean;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  noResultsIcon?: React.ComponentType<{ className?: string }>;
  noResultsTitle?: string;
  noResultsMessage?: string;

  // Modals et notifications
  modalsContent?: React.ReactNode;
  toastProps?: {
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
    onClose: () => void;
    autoClose?: boolean;
    autoCloseDelay?: number;
  };

  // Styling
  backgroundGradient?: string;
  containerMaxWidth?: string;
  contentPadding?: string;
  className?: string;
}

export function ListPageLayout<T>({
  // Header
  title,
  onBack,
  showBackButton = true,
  headerRightContent,
  filterContent,

  // Contenu principal
  items,
  loading = false,
  error,
  onRetry,

  // Rendu des items
  renderItem,
  renderSkeleton,
  skeletonCount = 5,

  // Stats et pagination
  statsContent,
  showPagination = true,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,

  // États vides
  isEmpty = false,
  hasNoResults = false,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  emptyAction,
  noResultsIcon,
  noResultsTitle,
  noResultsMessage,

  // Modals et notifications
  modalsContent,
  toastProps,

  // Styling
  backgroundGradient = "bg-gradient-to-br from-emerald-500 to-emerald-700",
  containerMaxWidth = "max-w-md",
  contentPadding = "px-5 py-6",
  className
}: ListPageLayoutProps<T>) {

  // Interface d'erreur
  if (error && !loading) {
    return (
      <ErrorState
        message={error}
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className={`min-h-screen ${backgroundGradient} ${className}`}>
      {/* Container mobile-first fixe */}
      <div className={`mx-auto ${containerMaxWidth} ${backgroundGradient} shadow-2xl min-h-screen`}>
        
        {/* Header glassmorphism */}
        <GlassHeader
          title={title}
          onBack={onBack}
          showBackButton={showBackButton}
          rightContent={headerRightContent}
          filterContent={filterContent}
        />

        {/* Contenu scrollable */}
        <div className={contentPadding}>
          
          {/* Stats Cards */}
          {statsContent && (
            <div className="mb-6">
              {statsContent}
            </div>
          )}

          {/* Pagination - En haut */}
          {showPagination && !loading && items.length > 0 && onPageChange && (
            <ListPagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={onPageChange}
              className="mb-4"
            />
          )}
          
          {/* Liste des éléments */}
          <ItemsList
            items={items}
            loading={loading}
            renderItem={renderItem}
            renderSkeleton={renderSkeleton}
            skeletonCount={skeletonCount}
            showNoResults={hasNoResults}
            emptyIcon={emptyIcon}
            emptyTitle={emptyTitle}
            emptyMessage={emptyMessage}
            emptyAction={emptyAction}
            noResultsIcon={noResultsIcon}
            noResultsTitle={noResultsTitle}
            noResultsMessage={noResultsMessage}
          />

        </div>
      </div>

      {/* Modals */}
      {modalsContent}

      {/* Toast notifications */}
      {toastProps && (
        <Toast
          isVisible={toastProps.isOpen}
          type={toastProps.type}
          title={toastProps.message}
          onClose={toastProps.onClose}
          duration={toastProps.autoCloseDelay || 4000}
        />
      )}
    </div>
  );
}

// Version simplifiée pour les cas d'usage basiques
export function SimpleListPageLayout<T>({
  title,
  onBack,
  items,
  loading,
  renderItem,
  ...props
}: Pick<ListPageLayoutProps<T>, 'title' | 'onBack' | 'items' | 'loading' | 'renderItem'> & 
   Partial<ListPageLayoutProps<T>>) {
  
  return (
    <ListPageLayout
      title={title}
      onBack={onBack}
      items={items}
      loading={loading}
      renderItem={renderItem}
      isEmpty={!loading && items.length === 0}
      showPagination={false}
      {...props}
    />
  );
}