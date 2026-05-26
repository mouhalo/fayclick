/**
 * Stats Cards Bons de Commande — 4 cartes glassmorphism
 *
 * FR-023 : Total BC / Montant total (LIVRÉ) / En attente (BROUILLON+CONFIRMÉ) / Livrés
 * Masquage montants si canViewMontants = false (profil CAISSIER)
 */

'use client';

import { motion } from 'framer-motion';
import { Package, Wallet, Clock, PackageCheck } from 'lucide-react';
import { BonCommandeResumeGlobal } from '@/types/bon-commande';
import { formatAmount } from '@/lib/utils';

interface StatsCardsBonsCommandesProps {
  resume: BonCommandeResumeGlobal | null;
  loading?: boolean;
  canViewMontants?: boolean;
}

export const StatsCardsBonsCommandes = ({
  resume,
  loading = false,
  canViewMontants = true,
}: StatsCardsBonsCommandesProps) => {
  if (loading || !resume) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-3 animate-pulse border border-white/20"
          >
            <div className="h-3 bg-white/20 rounded w-16 mb-2" />
            <div className="h-6 bg-white/20 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  const enAttente = (resume.nb_brouillons || 0) + (resume.nb_confirmes || 0);

  const stats = [
    {
      label: 'Total BC',
      value: (resume.total_bcs || 0).toString(),
      icon: <Package className="w-4 h-4" />,
      color: 'text-sky-400',
      bg: 'bg-sky-500/20',
    },
    {
      label: 'Montant livré',
      value: canViewMontants ? formatAmount(resume.montant_total_livre || 0) : '***',
      icon: <Wallet className="w-4 h-4" />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
    },
    {
      label: 'En attente',
      value: enAttente.toString(),
      icon: <Clock className="w-4 h-4" />,
      color: 'text-orange-400',
      bg: 'bg-orange-500/20',
    },
    {
      label: 'Livrés',
      value: (resume.nb_livres || 0).toString(),
      icon: <PackageCheck className="w-4 h-4" />,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/20',
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
            <div className={`${stat.bg} p-1 rounded-md ${stat.color}`}>{stat.icon}</div>
            <span className="text-white/60 text-xs">{stat.label}</span>
          </div>
          <p className="text-white font-bold text-sm sm:text-base">{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
};
