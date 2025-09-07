/**
 * Composant temporaire pour les statistiques produits
 * Version basique pour permettre la compilation
 */

import React from 'react';

export function StatsProduits({ articles, typeStructure }: any) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Statistiques Produits</h3>
      <p className="text-gray-600">
        {articles?.length || 0} produits • Type: {typeStructure}
      </p>
      <p className="text-sm text-gray-500 mt-2">
        Composant temporaire - Fonctionnalité en développement
      </p>
    </div>
  );
}

export function StatsProduitsLoading() {
  return (
    <div className="bg-gray-200 p-4 rounded-lg animate-pulse">
      <div className="h-4 bg-gray-300 rounded mb-2"></div>
      <div className="h-3 bg-gray-300 rounded w-2/3"></div>
    </div>
  );
}