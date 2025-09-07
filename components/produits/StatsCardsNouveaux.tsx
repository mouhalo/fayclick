/**
 * Composant de statistiques produits avec 4 cards
 * Design responsive avec calculs dynamiques depuis les données produits
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Store, TrendingUp, DollarSign } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Produit } from '@/types/produit';

interface StatsCardsNouveauxProps {
  articles: Produit[];
  ventes?: any[]; // TODO: Typer correctement les ventes
}

export function StatsCardsNouveaux({ articles, ventes = [] }: StatsCardsNouveauxProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();

  // Calculs dynamiques des statistiques
  const stats = useMemo(() => {
    if (!articles || articles.length === 0) {
      return {
        valeurMarchandisePA: 0,
        valeurStockPV: 0,
        valeurVentesRealisees: 0,
        beneficePotentiel: 0,
        beneficePotentielPct: 0,
        totalArticles: 0
      };
    }

    // 1. Valeur Marchandise (Prix d'achat) - Somme des (cout_revient * niveau_stock)
    const valeurMarchandisePA = articles.reduce((total, produit) => {
      const stock = produit.niveau_stock || 0;
      return total + (produit.cout_revient * stock);
    }, 0);

    // 2. Valeur Stock (Prix de vente) - Somme des (prix_vente * niveau_stock)
    const valeurStockPV = articles.reduce((total, produit) => {
      const stock = produit.niveau_stock || 0;
      return total + (produit.prix_vente * stock);
    }, 0);

    // 3. Valeur Ventes réalisées - TODO: À partir des vraies données de ventes
    // Pour l'instant, simulation basée sur une partie du stock vendu
    const valeurVentesRealisees = articles.reduce((total, produit) => {
      const stock = produit.niveau_stock || 0;
      // Simulation: on considère qu'on a vendu 20% du stock au prix de vente
      const ventesSimulees = Math.floor(stock * 0.2);
      return total + (produit.prix_vente * ventesSimulees);
    }, 0);

    // 4. Bénéfice Potentiel - Différence entre valeur stock PV et PA
    const beneficePotentiel = valeurStockPV - valeurMarchandisePA;
    const beneficePotentielPct = valeurMarchandisePA > 0 
      ? (beneficePotentiel / valeurMarchandisePA) * 100 
      : 0;

    const totalArticles = articles.length;

    return {
      valeurMarchandisePA,
      valeurStockPV,
      valeurVentesRealisees,
      beneficePotentiel,
      beneficePotentielPct,
      totalArticles
    };
  }, [articles, ventes]);

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

  // Configuration des 4 cards
  const statsCards = [
    {
      id: 'marchandise-pa',
      title: 'Valeur Marchandise (PA)',
      value: `${stats.valeurMarchandisePA.toLocaleString('fr-FR')} FCFA`,
      subtitle: `Total Articles: ${stats.totalArticles}`,
      icon: Package,
      gradient: 'from-blue-400 to-blue-500',
      bgGradient: 'from-blue-50 to-blue-100',
      delay: 0
    },
    {
      id: 'stock-pv',
      title: 'Valeur Stock (PV)',
      value: `${stats.valeurStockPV.toLocaleString('fr-FR')} FCFA`,
      subtitle: '',
      icon: Store,
      gradient: 'from-cyan-400 to-cyan-500',
      bgGradient: 'from-cyan-50 to-cyan-100',
      delay: 0.1
    },
    {
      id: 'ventes-realisees',
      title: 'Valeur Ventes réalisées',
      value: `${stats.valeurVentesRealisees.toLocaleString('fr-FR')} FCFA`,
      subtitle: '',
      icon: TrendingUp,
      gradient: 'from-emerald-400 to-emerald-500',
      bgGradient: 'from-emerald-50 to-emerald-100',
      delay: 0.2
    },
    {
      id: 'benefice-potentiel',
      title: 'Bénéfice Potentiel',
      value: `${stats.beneficePotentiel.toLocaleString('fr-FR')} FCFA`,
      subtitle: `(${stats.beneficePotentielPct.toFixed(2)}%)`,
      icon: DollarSign,
      gradient: 'from-amber-400 to-amber-500',
      bgGradient: 'from-amber-50 to-amber-100',
      delay: 0.3
    }
  ];

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
export function StatsCardsNouveauxLoading() {
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