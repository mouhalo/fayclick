'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

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
          Précédent
        </button>

        {/* Indicateur de page */}
        <div className="text-sm text-gray-600">
          Page <span className="font-semibold">{currentPage}</span> sur <span className="font-semibold">{totalPages}</span>
          <span className="mx-2">•</span>
          <span className="font-semibold">{totalItems}</span> résultat(s)
        </div>

        {/* Bouton Suivant */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Suivant
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
