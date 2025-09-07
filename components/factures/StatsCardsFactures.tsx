/**
 * Composant de statistiques factures avec 4 cards
 * Design responsive avec calculs dynamiques depuis les données factures
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt, DollarSign, CreditCard, TrendingUp } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { StatsFactures } from '@/types/facture';

interface StatsCardsFacturesProps {
  stats: StatsFactures | null;
  loading?: boolean;
}

export function StatsCardsFactures({ stats, loading = false }: StatsCardsFacturesProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();

  // Configuration responsive
  const getCardStyles = () => {
    if (isMobile) {
      return {
        container: 'grid grid-cols-2 gap-3',
        card: 'p-3',
        icon: 'w-8 h-8',
        iconContainer: 'w-12 h-12',
        title: 'text-xs',
        value: 'text-sm font-bold',
        subtitle: 'text-xs'
      };
    } else if (isMobileLarge) {
      return {
        container: 'grid grid-cols-2 gap-4',
        card: 'p-4',
        icon: 'w-10 h-10',
        iconContainer: 'w-14 h-14',
        title: 'text-sm',
        value: 'text-base font-bold',
        subtitle: 'text-sm'
      };
    } else {
      return {
        container: 'grid grid-cols-2 lg:grid-cols-4 gap-4',
        card: 'p-5',
        icon: 'w-12 h-12',
        iconContainer: 'w-16 h-16',
        title: 'text-sm',
        value: 'text-lg font-bold',
        subtitle: 'text-sm'
      };
    }
  };

  const styles = getCardStyles();

  // Configuration des 4 cards avec données par défaut
  const statsCards = useMemo(() => [
    {
      id: 'total-ventes',
      title: 'Total Ventes',
      value: stats ? `${stats.totalVentes}` : '0',
      subtitle: stats ? `${stats.clientsUniques} clients` : '0 clients',
      icon: Receipt,
      gradient: 'from-blue-400 to-blue-500',
      bgGradient: 'from-blue-50 to-blue-100',
      delay: 0
    },
    {
      id: 'montant-total',
      title: 'Montant Total',
      value: stats ? `${stats.montantTotal.toLocaleString('fr-FR')} FCFA` : '0 FCFA',
      subtitle: stats ? `${stats.totalProduitsDifferents} produits` : '0 produits',
      icon: DollarSign,
      gradient: 'from-emerald-400 to-emerald-500',
      bgGradient: 'from-emerald-50 to-emerald-100',
      delay: 0.1
    },
    {
      id: 'montant-paye',
      title: 'Montant Payé',
      value: stats ? `${stats.montantPaye.toLocaleString('fr-FR')} FCFA` : '0 FCFA',
      subtitle: stats ? `${((stats.montantPaye / (stats.montantTotal || 1)) * 100).toFixed(1)}%` : '0%',
      icon: CreditCard,
      gradient: 'from-cyan-400 to-cyan-500',
      bgGradient: 'from-cyan-50 to-cyan-100',
      delay: 0.2
    },
    {
      id: 'restant-payer',
      title: 'Restant à Payer',
      value: stats ? `${stats.restantPayer.toLocaleString('fr-FR')} FCFA` : '0 FCFA',
      subtitle: stats ? `${stats.margeTotale.toLocaleString('fr-FR')} FCFA marge` : '0 FCFA marge',
      icon: TrendingUp,
      gradient: 'from-amber-400 to-amber-500',
      bgGradient: 'from-amber-50 to-amber-100',
      delay: 0.3
    }
  ], [stats]);

  if (loading) {
    return <StatsCardsFacturesLoading />;
  }

  return (
    <div className={styles.container}>
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
          whileHover={{ scale: isMobile ? 1 : 1.02 }}
          className={`
            bg-gradient-to-br ${card.bgGradient} 
            border border-white/50 rounded-2xl ${styles.card}
            shadow-sm hover:shadow-md transition-all duration-200
            backdrop-blur-sm
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Titre */}
              <p className={`text-gray-600 ${styles.title} font-medium mb-1 leading-tight`}>
                {card.title}
              </p>
              
              {/* Valeur principale */}
              <p className={`text-gray-900 ${styles.value} mb-1 leading-tight`}>
                {card.value}
              </p>
              
              {/* Sous-titre */}
              {card.subtitle && (
                <p className={`text-gray-500 ${styles.subtitle} leading-tight`}>
                  {card.subtitle}
                </p>
              )}
            </div>

            {/* Icône */}
            <div className={`
              ${styles.iconContainer} bg-gradient-to-br ${card.gradient} 
              rounded-xl flex items-center justify-center flex-shrink-0
              shadow-sm ml-2
            `}>
              <card.icon className={`${styles.icon} text-white`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Composant de loading pendant le chargement des données
export function StatsCardsFacturesLoading() {
  const { isMobile, isMobileLarge } = useBreakpoint();

  const getLoadingStyles = () => {
    if (isMobile) {
      return {
        container: 'grid grid-cols-2 gap-3',
        card: 'p-3',
        height: 'h-20'
      };
    } else if (isMobileLarge) {
      return {
        container: 'grid grid-cols-2 gap-4',
        card: 'p-4',
        height: 'h-24'
      };
    } else {
      return {
        container: 'grid grid-cols-2 lg:grid-cols-4 gap-4',
        card: 'p-5',
        height: 'h-28'
      };
    }
  };

  const styles = getLoadingStyles();

  return (
    <div className={styles.container}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`
            bg-gradient-to-br from-gray-100 to-gray-200 
            rounded-2xl ${styles.card} ${styles.height}
            animate-pulse
          `}
        >
          <div className="flex items-start justify-between h-full">
            <div className="flex-1">
              <div className="h-3 bg-gray-300 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 rounded mb-1"></div>
              <div className="h-2 bg-gray-300 rounded w-2/3"></div>
            </div>
            <div className="w-12 h-12 bg-gray-300 rounded-xl flex-shrink-0 ml-2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}