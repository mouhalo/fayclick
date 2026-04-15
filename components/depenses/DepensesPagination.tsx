'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';

interface DepensesPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
}

export default function DepensesPagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems
}: DepensesPaginationProps) {
  const t = useTranslations('expenses');
  if (totalPages <= 1) return null;

  return (
    <div className="p-4 bg-white border-t border-gray-200">
      <div className="flex items-center justify-between">
        {/* Bouton Précédent */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={16} />
          {t('pagination.previous')}
        </button>

        {/* Indicateur de page */}
        <div className="text-sm text-gray-600">
          {t('pagination.pageInfo', { current: currentPage, total: totalPages })}
          <span className="mx-2">•</span>
          {t(totalItems > 1 ? 'pagination.resultPlural' : 'pagination.resultSingular', { count: totalItems })}
        </div>

        {/* Bouton Suivant */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {t('pagination.next')}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
