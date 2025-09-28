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
import { FactureComplete, ResumeGlobal } from '@/types/facture';

interface StatsCardsFacturesGlassProps {
  factures?: FactureComplete[];
  totalFactures?: number;
  montantTotal?: number;
  montantPaye?: number;
  montantImpaye?: number;
  resumeGlobal?: ResumeGlobal;
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
    if (f.details && Array.isArray(f.details)) {
      f.details.forEach(d => {
        if (d && (d.nom_produit || d.libelle || d.description)) {
          produitsUniques.add(d.nom_produit || d.libelle || d.description);
        }
      });
    }
  });

  console.log('🔍 [STATS] Debug calcul stats:', {
    nombreFactures: factures.length,
    clientsUniques,
    produitsUniques: produitsUniques.size,
    produitsUniquesList: Array.from(produitsUniques),
    premiereFacture: factures[0] ? {
      hasDetails: !!factures[0].details,
      detailsLength: factures[0].details?.length || 0,
      premierDetail: factures[0].details?.[0]
    } : null
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

export function StatsCardsFacturesGlass({
  factures,
  totalFactures,
  montantTotal,
  montantPaye,
  montantImpaye,
  resumeGlobal,
  loading = false
}: StatsCardsFacturesGlassProps) {
  // Utiliser directement les données du resume_global avec fallback sur calcul dynamique
  const stats = useMemo(() => {
    if (resumeGlobal) {
      // Utiliser directement les données du serveur
      console.log('📊 [STATS] Utilisation resume_global:', resumeGlobal);

      // Calcul fallback pour les champs manquants
      let clientsUniques = 0;
      let totalProduitsDifferents = 0;
      let margeTotale = 0;

      if (factures && factures.length > 0) {
        const dynamicStats = calculateDynamicStats(factures);
        clientsUniques = dynamicStats.clientsUniques;
        totalProduitsDifferents = dynamicStats.totalProduitsDifferents;
        margeTotale = dynamicStats.margeTotale;
      }

      return {
        totalVentes: resumeGlobal.nombre_factures,
        montantTotal: resumeGlobal.montant_total,
        montantPaye: resumeGlobal.montant_paye,
        restantPayer: resumeGlobal.montant_impaye,
        clientsUniques: resumeGlobal.nombre_clients || clientsUniques,
        totalProduitsDifferents: resumeGlobal.nombre_produits || totalProduitsDifferents,
        margeTotale: resumeGlobal.marge_totale || margeTotale
      };
    } else if (factures && factures.length > 0) {
      // Fallback sur calcul dynamique
      return calculateDynamicStats(factures);
    } else {
      // Stats vides par défaut
      return calculateDynamicStats([]);
    }
  }, [resumeGlobal, factures]);
  
  // Configuration des 4 cards avec données dynamiques - Style vert comme le design
  const statsCards = useMemo(() => [
    {
      id: 'total-ventes',
      title: 'Total Ventes',
      value: stats ? `${stats.totalVentes}` : '0',
      subtitle: stats ? `${stats.clientsUniques} clients` : '0 clients',
      icon: Receipt,
      iconColor: 'text-white',
      iconBg: 'bg-blue-500',
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
      iconBg: 'bg-emerald-500',
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
      iconBg: 'bg-cyan-500',
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
      iconBg: 'bg-orange-500',
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
          <div className="bg-green-800/90 backdrop-blur-sm rounded-2xl p-4 border border-green-700/50 hover:scale-[1.02] transition-transform duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Titre */}
                <p className="text-white text-xs font-medium mb-1 leading-tight truncate">
                  {card.title}
                </p>

                {/* Valeur principale */}
                <p className="text-white text-lg font-bold mb-1 leading-tight" title={card.fullValue}>
                  {card.value}
                </p>

                {/* Sous-titre */}
                <p className="text-white/80 text-xs leading-tight truncate">
                  {card.subtitle}
                </p>
              </div>

              {/* Icône colorée comme dans le design */}
              <div className={`
                w-10 h-10 ${card.iconBg}
                rounded-xl flex items-center justify-center flex-shrink-0
                shadow-lg ml-2
              `}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
          </div>
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