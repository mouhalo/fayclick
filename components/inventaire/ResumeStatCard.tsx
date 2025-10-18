'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ResumeStatCardProps {
  titre: string;
  valeur: number | string;
  variation: number;
  suffix?: string;
  icon?: ReactNode;
  variationLabel?: string;
}

/**
 * Carte de statistique avec indicateur de variation
 * Affiche une métrique clé avec sa variation par rapport à la période précédente
 */
export default function ResumeStatCard({
  titre,
  valeur,
  variation,
  suffix = '',
  icon,
  variationLabel = 'vs mois dernier'
}: ResumeStatCardProps) {
  const isPositive = variation >= 0;
  const isNeutral = variation === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl p-4 shadow-lg border-l-4 border-emerald-500 hover:shadow-xl transition-all duration-300"
    >
      {/* Icône si fournie */}
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
          {icon}
        </div>
      )}

      {/* Valeur principale */}
      <div className="text-3xl font-bold text-gray-800 mb-1">
        {typeof valeur === 'number' ? valeur.toLocaleString('fr-FR') : valeur}
        {suffix && <span className="text-xl text-gray-600 ml-1">{suffix}</span>}
      </div>

      {/* Titre de la statistique */}
      <div className="text-sm text-gray-600 font-semibold mb-2">
        {titre}
      </div>

      {/* Indicateur de variation */}
      <div className="flex items-center gap-1">
        {!isNeutral && (
          isPositive ? (
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600" />
          )
        )}
        <span
          className={`text-sm font-semibold ${
            isNeutral
              ? 'text-gray-500'
              : isPositive
              ? 'text-emerald-600'
              : 'text-red-600'
          }`}
        >
          {isPositive && variation !== 0 && '+'}
          {variation.toFixed(1)}%
        </span>
        <span className="text-xs text-gray-500 ml-1">
          {variationLabel}
        </span>
      </div>
    </motion.div>
  );
}
