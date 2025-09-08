/**
 * Composant ProduitsStatsHeader
 * Affiche les statistiques dans le header avec design glassmorphism
 */

'use client';

import { Produit } from '@/types/produit';

interface ProduitsStatsHeaderProps {
  produits: Produit[];
  loading?: boolean;
}

export function ProduitsStatsHeader({ 
  produits, 
  loading = false 
}: ProduitsStatsHeaderProps) {
  if (loading) {
    return (
      <div className="text-sm text-emerald-100">
        <div className="animate-pulse bg-white/20 h-4 w-20 rounded"></div>
      </div>
    );
  }

  // Ne rien afficher - header simplifié
  return null;
}