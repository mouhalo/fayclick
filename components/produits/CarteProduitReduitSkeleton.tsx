/**
 * Skeleton de chargement pour CarteProduitReduit
 * Affiche un placeholder animé pendant le chargement des données
 */

'use client';

export function CarteProduitReduitSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-3 flex items-start justify-between gap-2">
        {/* Nom + badge */}
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-12 bg-gray-300 rounded-full"></div>
            <div className="h-3 w-16 bg-gray-300 rounded"></div>
          </div>
        </div>

        {/* Menu 3 points placeholder */}
        <div className="w-8 h-8 bg-gray-300 rounded-lg flex-shrink-0"></div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {/* Grid Prix + Stock */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-100 rounded-lg p-2.5">
            <div className="h-3 bg-gray-300 rounded w-12 mb-1"></div>
            <div className="h-4 bg-gray-300 rounded w-20"></div>
          </div>
          <div className="bg-gray-100 rounded-lg p-2.5">
            <div className="h-3 bg-gray-300 rounded w-12 mb-1"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
        </div>

        {/* Description placeholder */}
        <div className="bg-gray-100 rounded-lg p-2">
          <div className="h-3 bg-gray-300 rounded w-full"></div>
        </div>

        {/* Contrôles quantité */}
        <div className="flex items-center justify-center gap-3 bg-gray-100 rounded-lg p-2">
          <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
          <div className="w-8 h-6 bg-gray-300 rounded"></div>
          <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
        </div>

        {/* Bouton Vendre */}
        <div className="h-10 bg-gray-300 rounded-lg"></div>
      </div>
    </div>
  );
}
