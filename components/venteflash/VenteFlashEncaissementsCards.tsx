/**
 * Cartes « Encaissements par mode » de la Vente Flash.
 *
 * Affichées sous les StatCards du jour : une carte par mode de paiement avec
 * le nombre de paiements et le montant encaissé.
 *
 * Rangée dédiée plutôt qu'une extension de VenteFlashStatsCards : ce dernier est
 * un grid-cols-3 fixe, y greffer quatre à cinq modes casserait la maille.
 */

'use client';

import { motion } from 'framer-motion';
import {
  MODES_PAIEMENT_META,
  type ModePaiementNormalise,
} from '@/lib/payment-methods';
import type { EncaissementParMode } from '@/types/rapport-encaissements';
import { useTranslations } from '@/hooks/useTranslations';

interface VenteFlashEncaissementsCardsProps {
  /** Agrégats par mode, déjà complétés par le service (CASH/OM/WAVE/FREE toujours présents). */
  encaissements: EncaissementParMode[];
  isLoading?: boolean;
  /**
   * Si false (droit « VOIR CHIFFRE D'AFFAIRE » absent), les montants sont
   * remplacés par `***`. Les compteurs de paiements restent visibles : un
   * caissier doit pouvoir vérifier le nombre d'opérations qu'il a saisies.
   */
  canViewMontants?: boolean;
}

export function VenteFlashEncaissementsCards({
  encaissements,
  isLoading = false,
  canViewMontants = true,
}: VenteFlashEncaissementsCardsProps) {
  const t = useTranslations('paymentReport');

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!encaissements || encaissements.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">{t('title')}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {encaissements.map((encaissement, index) => {
          const meta =
            MODES_PAIEMENT_META[encaissement.mode as ModePaiementNormalise] ??
            MODES_PAIEMENT_META.AUTRES;
          const Icon = meta.icon;

          return (
            <motion.div
              key={encaissement.mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                bg-gradient-to-br ${meta.bgGradient}
                rounded-xl p-3 shadow-lg border-2 border-white/50
                hover:shadow-xl transition-all
              `}
            >
              {/* Icône */}
              <div className="flex justify-center mb-2">
                <div
                  className={`
                    w-10 h-10 rounded-full
                    bg-gradient-to-br ${meta.gradient}
                    flex items-center justify-center shadow-lg
                  `}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Contenu */}
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1 leading-tight">
                  {t(meta.labelKey)}
                </div>
                <div className="text-base sm:text-lg font-bold text-gray-900 leading-tight break-words">
                  {canViewMontants
                    ? `${encaissement.montant_total.toLocaleString('fr-FR')} FCFA`
                    : '***'}
                </div>
                <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                  {t('count')} : {encaissement.nb_paiements}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
