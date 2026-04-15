/**
 * Composant de statistiques factures avec design glassmorphism
 * Version adaptée pour l'interface glassmorphism mobile-first
 * Stats dynamiques basées sur les factures filtrées
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt, DollarSign, CreditCard, TrendingUp } from 'lucide-react';
import { FactureComplete, ResumeGlobal } from '@/types/facture';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/lib/format-locale';

interface StatsCardsFacturesGlassProps {
  factures?: FactureComplete[];
  totalFactures?: number;
  montantTotal?: number;
  montantPaye?: number;
  montantImpaye?: number;
  resumeGlobal?: ResumeGlobal;
  loading?: boolean;
  /** Si false, remplace les montants par *** (caissier) */
  canViewMontants?: boolean;
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
  loading = false,
  canViewMontants = true
}: StatsCardsFacturesGlassProps) {
  const t = useTranslations('invoices');
  const { locale } = useLanguage();
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
  
  // Configuration des 4 cards avec données dynamiques - Affichage complet sans formatage K/M
  // Nombre d'impayés (toujours visible, même pour caissier)
  const nombreImpayes = useMemo(() => {
    if (!factures) return 0;
    return factures.filter(f => (f.facture?.mt_restant || 0) > 0).length;
  }, [factures]);

  const statsCards = useMemo(() => {
    const clientsCount = stats?.clientsUniques ?? 0;
    const productsCount = stats?.totalProduitsDifferents ?? 0;
    return [
    {
      id: 'total-ventes',
      title: t('stats.totalSales'),
      value: stats ? `${stats.totalVentes}` : '0',
      subtitle: t(clientsCount > 1 ? 'stats.clientsPlural' : 'stats.clientsSingular', { count: clientsCount }),
      icon: Receipt,
      iconColor: 'text-white',
      iconBg: 'bg-blue-500',
      delay: 0
    },
    {
      id: 'montant-total',
      title: t('stats.totalAmount'),
      value: canViewMontants ? (stats ? formatNumber(stats.montantTotal, locale) : '0') : '******',
      subtitle: canViewMontants ? t(productsCount > 1 ? 'stats.productsPlural' : 'stats.productsSingular', { count: productsCount }) : '',
      icon: DollarSign,
      iconColor: 'text-white',
      iconBg: 'bg-emerald-500',
      delay: 0.1
    },
    {
      id: 'montant-paye',
      title: t('stats.paidAmount'),
      value: canViewMontants ? (stats ? formatNumber(stats.montantPaye, locale) : '0') : '******',
      subtitle: canViewMontants ? (stats ? `${((stats.montantPaye / (stats.montantTotal || 1)) * 100).toFixed(0)}%` : '0%') : '',
      icon: CreditCard,
      iconColor: 'text-white',
      iconBg: 'bg-cyan-500',
      delay: 0.2
    },
    {
      id: 'restant-payer',
      title: t('stats.unpaid'),
      value: canViewMontants ? (stats ? formatNumber(stats.restantPayer, locale) : '0') : `${nombreImpayes}`,
      subtitle: canViewMontants
        ? t('stats.margin', { amount: stats ? formatNumber(stats.margeTotale, locale) : '0' })
        : t('stats.unpaidInvoices'),
      icon: TrendingUp,
      iconColor: 'text-white',
      iconBg: 'bg-orange-500',
      delay: 0.3
    }
  ];
  }, [stats, canViewMontants, nombreImpayes, t, locale]);

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
          <div className="bg-green-800/90 backdrop-blur-sm rounded-2xl p-3 border border-green-700/50 hover:scale-[1.02] transition-transform duration-200">
            {/* Layout horizontal : Icône à gauche, infos à droite */}
            <div className="flex items-center gap-3">
              {/* Icône à gauche */}
              <div className={`
                w-12 h-12 ${card.iconBg}
                rounded-xl flex items-center justify-center
                shadow-lg flex-shrink-0
              `}>
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>

              {/* Contenu textuel à droite */}
              <div className="flex-1 min-w-0">
                {/* Titre */}
                <p className="text-white/80 text-xs font-medium leading-tight">
                  {card.title}
                </p>

                {/* Valeur principale */}
                <p className="text-white text-lg font-bold leading-tight truncate">
                  {card.value}
                </p>

                {/* Sous-titre */}
                <p className="text-white/60 text-[10px] leading-tight">
                  {card.subtitle}
                </p>
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
          <div className="bg-green-800/90 backdrop-blur-sm rounded-2xl p-3 border border-green-700/50 animate-pulse">
            <div className="flex items-center gap-3">
              {/* Icône skeleton */}
              <div className="w-12 h-12 bg-white/20 rounded-xl flex-shrink-0"></div>
              {/* Texte skeleton */}
              <div className="flex-1">
                <div className="h-3 bg-white/20 rounded mb-2 w-3/4"></div>
                <div className="h-5 bg-white/30 rounded mb-1 w-1/2"></div>
                <div className="h-2 bg-white/20 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}