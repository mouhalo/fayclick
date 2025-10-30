/**
 * Cartes statistiques Vente Flash
 * Section 2: 3 StatCards (Nombre de ventes, Total ventes, CA du jour)
 */

'use client';

import { motion } from 'framer-motion';
import { Receipt, TrendingUp, DollarSign } from 'lucide-react';
import { VenteFlashStats } from '@/types/venteflash.types';

interface VenteFlashStatsCardsProps {
  stats: VenteFlashStats;
  isLoading?: boolean;
}

export function VenteFlashStatsCards({
  stats,
  isLoading = false
}: VenteFlashStatsCardsProps) {
  const statsData = [
    {
      id: 'nb_ventes',
      label: 'Nombre de ventes',
      value: stats.nb_ventes,
      icon: Receipt,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100'
    },
    {
      id: 'total_ventes',
      label: 'Total ventes',
      value: `${stats.total_ventes.toLocaleString('fr-FR')} FCFA`,
      icon: TrendingUp,
      color: 'green',
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100'
    },
    {
      id: 'ca_jour',
      label: 'CA du jour',
      value: `${stats.ca_jour.toLocaleString('fr-FR')} FCFA`,
      icon: DollarSign,
      color: 'orange',
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-50 to-orange-100'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-xl h-24 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 mb-6">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              bg-gradient-to-br ${stat.bgGradient}
              rounded-xl p-3 shadow-lg border-2 border-white/50
              hover:shadow-xl transition-all
            `}
          >
            {/* Icône en haut */}
            <div className="flex justify-center mb-2">
              <div className={`
                w-10 h-10 rounded-full
                bg-gradient-to-br ${stat.gradient}
                flex items-center justify-center
                shadow-lg
              `}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Contenu centré */}
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1 leading-tight">
                {stat.label}
              </div>
              <div className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                {stat.value}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
