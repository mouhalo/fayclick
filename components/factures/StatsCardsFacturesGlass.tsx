/**
 * Composant de statistiques factures avec design glassmorphism
 * Version adaptée pour l'interface glassmorphism mobile-first
 * Stats dynamiques basées sur les factures filtrées
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt, DollarSign, CreditCard, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { FactureComplete } from '@/types/facture';

interface StatsCardsFacturesGlassProps {
  factures: FactureComplete[];
  loading?: boolean;
}

// Fonction utilitaire pour calculer les stats dynamiques
function calculateDynamicStats(factures: FactureComplete[]) {
  if (!factures || factures.length === 0) {
    return {
      totalVentes: 0,
      montantTotal: 0,
      montantPaye: 0,
      restantPayer: 0,
      clientsUniques: 0,
      totalProduitsDifferents: 0,
      margeTotale: 0
    };
  }

  // Clients uniques
  const clientsUniques = new Set(factures.map(f => f.facture.tel_client)).size;
  
  // Produits différents
  const produitsUniques = new Set();
  factures.forEach(f => {
    f.details.forEach(d => produitsUniques.add(d.nom_produit));
  });

  // Calculs financiers
  const montantTotal = factures.reduce((sum, f) => sum + f.facture.montant, 0);
  const montantPaye = factures.reduce((sum, f) => sum + f.facture.mt_acompte, 0);
  const restantPayer = factures.reduce((sum, f) => sum + f.facture.mt_restant, 0);
  const margeTotale = factures.reduce((sum, f) => sum + f.resume.marge_totale, 0);

  return {
    totalVentes: factures.length,
    montantTotal,
    montantPaye,
    restantPayer,
    clientsUniques,
    totalProduitsDifferents: produitsUniques.size,
    margeTotale
  };
}

export function StatsCardsFacturesGlass({ factures, loading = false }: StatsCardsFacturesGlassProps) {
  // Calcul des stats dynamiques basées sur les factures filtrées
  const stats = useMemo(() => calculateDynamicStats(factures), [factures]);
  
  // Configuration des 4 cards avec données dynamiques
  const statsCards = useMemo(() => [
    {
      id: 'total-ventes',
      title: 'Total Ventes',
      value: stats ? `${stats.totalVentes}` : '0',
      subtitle: stats ? `${stats.clientsUniques} clients` : '0 clients',
      icon: Receipt,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-blue-400 to-blue-500',
      delay: 0
    },
    {
      id: 'montant-total',
      title: 'Montant Total',
      value: stats ? `${(stats.montantTotal / 1000).toFixed(0)}K` : '0K',
      fullValue: stats ? `${stats.montantTotal.toLocaleString('fr-FR')} FCFA` : '0 FCFA',
      subtitle: stats ? `${stats.totalProduitsDifferents} produits` : '0 produits',
      icon: DollarSign,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-500',
      delay: 0.1
    },
    {
      id: 'montant-paye',
      title: 'Montant Payé',
      value: stats ? `${(stats.montantPaye / 1000).toFixed(0)}K` : '0K',
      fullValue: stats ? `${stats.montantPaye.toLocaleString('fr-FR')} FCFA` : '0 FCFA',
      subtitle: stats ? `${((stats.montantPaye / (stats.montantTotal || 1)) * 100).toFixed(0)}%` : '0%',
      icon: CreditCard,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-cyan-400 to-cyan-500',
      delay: 0.2
    },
    {
      id: 'restant-payer',
      title: 'Restant à Payer',
      value: stats ? `${(stats.restantPayer / 1000).toFixed(0)}K` : '0K',
      fullValue: stats ? `${stats.restantPayer.toLocaleString('fr-FR')} FCFA` : '0 FCFA',
      subtitle: stats ? `${(stats.margeTotale / 1000).toFixed(0)}K marge` : '0K marge',
      icon: TrendingUp,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-amber-400 to-amber-500',
      delay: 0.3
    }
  ], [stats]);

  if (loading) {
    return <StatsCardsFacturesGlassLoading />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {statsCards.map((card) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            delay: card.delay, 
            duration: 0.5, 
            type: 'spring',
            stiffness: 100 
          }}
          whileHover={{ scale: 1.02 }}
        >
          <GlassCard className="p-4 hover:scale-[1.02] transition-transform duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Titre */}
                <p className="text-emerald-100 text-xs font-medium mb-1 leading-tight truncate">
                  {card.title}
                </p>
                
                {/* Valeur principale */}
                <p className="text-white text-lg font-bold mb-1 leading-tight" title={card.fullValue}>
                  {card.value}
                </p>
                
                {/* Sous-titre */}
                <p className="text-emerald-200 text-xs leading-tight truncate">
                  {card.subtitle}
                </p>
              </div>

              {/* Icône */}
              <div className={`
                w-10 h-10 ${card.iconBg} 
                rounded-xl flex items-center justify-center flex-shrink-0
                shadow-lg shadow-black/20 ml-2
              `}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}

// Composant de loading pendant le chargement des données
export function StatsCardsFacturesGlassLoading() {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <GlassCard className="p-4 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-3 bg-white/20 rounded mb-2 w-3/4"></div>
                <div className="h-5 bg-white/30 rounded mb-1 w-1/2"></div>
                <div className="h-2 bg-white/20 rounded w-2/3"></div>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex-shrink-0 ml-2"></div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}