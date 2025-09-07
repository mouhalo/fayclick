/**
 * Composant ProduitsStatsHeader
 * Affiche les statistiques dans le header avec design glassmorphism
 */

'use client';

import { motion } from 'framer-motion';
import { Package, Download, Upload } from 'lucide-react';
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
      <div className="flex items-center justify-between">
        <div className="text-sm text-emerald-100">
          <div className="animate-pulse bg-white/20 h-4 w-24 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="animate-pulse bg-white/20 h-8 w-8 rounded-lg"></div>
          <div className="animate-pulse bg-white/20 h-8 w-8 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-emerald-100">
        <span className="font-medium">{produits.length} produits</span>
      </div>
      
      {produits.length > 0 && (
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="p-2 text-emerald-100 hover:bg-white/10 rounded-lg transition-colors"
            title="Exporter"
          >
            <Download className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="p-2 text-emerald-100 hover:bg-white/10 rounded-lg transition-colors"
            title="Importer"
          >
            <Upload className="w-4 h-4" />
          </motion.button>
        </div>
      )}
    </div>
  );
}