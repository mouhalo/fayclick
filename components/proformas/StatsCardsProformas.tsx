/**
 * Cartes statistiques pour les proformas
 * Design glassmorphism coherent avec StatsCardsFacturesGlass
 */

'use client';

import { motion } from 'framer-motion';
import { FileCheck, Clock, CheckCircle, ArrowRightLeft } from 'lucide-react';
import { ProformaResumeGlobal } from '@/types/proforma';
import { formatAmount } from '@/lib/utils';

interface StatsCardsProformasProps {
  resume: ProformaResumeGlobal | null;
  loading?: boolean;
  canViewMontants?: boolean;
}

export const StatsCardsProformas = ({ resume, loading = false, canViewMontants = true }: StatsCardsProformasProps) => {
  if (loading || !resume) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 animate-pulse border border-white/20">
            <div className="h-3 bg-white/20 rounded w-16 mb-2" />
            <div className="h-6 bg-white/20 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Total',
      value: resume.total_proformas.toString(),
      icon: <FileCheck className="w-4 h-4" />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/20',
    },
    {
      label: 'Montant',
      value: canViewMontants ? formatAmount(resume.montant_total) : '***',
      icon: <Clock className="w-4 h-4" />,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
    },
    {
      label: 'En attente',
      value: (resume.nb_brouillons + resume.nb_acceptees).toString(),
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'text-orange-400',
      bg: 'bg-orange-500/20',
    },
    {
      label: 'Converties',
      value: resume.nb_converties.toString(),
      icon: <ArrowRightLeft className="w-4 h-4" />,
      color: 'text-violet-400',
      bg: 'bg-violet-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className={`${stat.bg} p-1 rounded-md ${stat.color}`}>
              {stat.icon}
            </div>
            <span className="text-white/60 text-xs">{stat.label}</span>
          </div>
          <p className="text-white font-bold text-sm sm:text-base">{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
};
