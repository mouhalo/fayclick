/**
 * Carte d'un Bon de Commande dans la liste — design glassmorphism bleu/sky
 *
 * FR-020 : Actions contextuelles selon statut + masquage montants si CAISSIER
 *  - BROUILLON : Voir / Modifier / Changer statut / Imprimer / Supprimer
 *  - CONFIRME  : Voir / Imprimer / Changer statut / Supprimer
 *  - LIVRE     : Voir / Imprimer uniquement (verrouillé)
 *  - ANNULE    : Voir / Imprimer / Supprimer
 */

'use client';

import { motion } from 'framer-motion';
import { Eye, Pencil, Printer, Trash2, ListChecks, Package } from 'lucide-react';
import { BonCommandeStatusBadge } from './BonCommandeStatusBadge';
import { BonCommande } from '@/types/bon-commande';
import { formatAmount, formatDate } from '@/lib/utils';

interface BonCommandeCardProps {
  bonCommande: BonCommande;
  canViewMontants?: boolean;
  onView?: (bc: BonCommande) => void;
  onEdit?: (bc: BonCommande) => void;
  onPrint?: (bc: BonCommande) => void;
  onChangeStatus?: (bc: BonCommande) => void;
  onDelete?: (bc: BonCommande) => void;
  delay?: number;
}

export const BonCommandeCard = ({
  bonCommande,
  canViewMontants = true,
  onView,
  onEdit,
  onPrint,
  onChangeStatus,
  onDelete,
  delay = 0,
}: BonCommandeCardProps) => {
  const statut = bonCommande.libelle_etat;
  const isLivre = statut === 'LIVRE';
  const isAnnule = statut === 'ANNULE';
  const isVerrouille = isLivre; // Édition/suppression interdites si LIVRÉ
  const canEdit = !isVerrouille && !isAnnule;
  const canDelete = !isLivre;
  // ANNULÉ et LIVRÉ ne peuvent plus changer de statut (états terminaux)
  const canChangeStatus = !isVerrouille && !isAnnule;

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 100, damping: 12, delay },
    },
  };

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" layout className="w-full">
      <div
        className="
        bg-sky-800/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4
        border border-sky-700/50 hover:bg-sky-800
        transition-all duration-200
        group relative overflow-hidden
      "
      >
        {/* En-tête : numéro + statut */}
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base sm:text-lg tracking-wide truncate pr-2 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-sky-300 flex-shrink-0" />
              <span className="truncate">{bonCommande.num_bc}</span>
            </h3>
            <p className="text-white/80 text-xs sm:text-sm">
              {bonCommande.nb_articles} article{bonCommande.nb_articles > 1 ? 's' : ''}
            </p>
          </div>
          <BonCommandeStatusBadge statut={statut} size="sm" />
        </div>

        {/* Informations fournisseur */}
        <div className="mb-3 sm:mb-4 space-y-1 sm:space-y-2 text-white/80 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 sm:w-4 sm:h-4">🏢</span>
            <span className="font-medium truncate">
              {bonCommande.nom_fournisseur_snap || 'Fournisseur'}
              {bonCommande.mt_remise > 0 && (
                <span className="text-orange-300 ml-1">
                  (Remise: {canViewMontants ? formatAmount(bonCommande.mt_remise) : '******'})
                </span>
              )}
            </span>
          </div>
          {bonCommande.tel_fournisseur_snap && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 sm:w-4 sm:h-4">📞</span>
              <span>{bonCommande.tel_fournisseur_snap}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 sm:w-4 sm:h-4">📅</span>
            <span>{formatDate(bonCommande.date_bon_commande)}</span>
          </div>
        </div>

        {/* Montant principal */}
        <div className="text-center mb-3 sm:mb-4">
          <p className="text-white text-xl sm:text-2xl font-bold">
            {canViewMontants ? formatAmount(bonCommande.montant_net) : '******'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-1 sm:gap-2">
          {/* Voir détails — toujours visible */}
          <button
            onClick={() => onView?.(bonCommande)}
            className="flex-1 min-w-[60px] py-1.5 sm:py-2 bg-white/20 rounded-md sm:rounded-lg text-white text-xs sm:text-sm hover:bg-white/30 transition-colors flex items-center justify-center gap-1"
            title="Voir détails"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Voir</span>
          </button>

          {/* Modifier — si pas LIVRÉ ni ANNULÉ */}
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(bonCommande)}
              className="flex-1 min-w-[60px] py-1.5 sm:py-2 bg-blue-500/20 rounded-md sm:rounded-lg text-blue-200 text-xs sm:text-sm hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-1"
              title="Modifier"
            >
              <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Modif.</span>
            </button>
          )}

          {/* Changer statut — si pas terminal */}
          {canChangeStatus && onChangeStatus && (
            <button
              onClick={() => onChangeStatus(bonCommande)}
              className="flex-1 min-w-[60px] py-1.5 sm:py-2 bg-emerald-500/20 rounded-md sm:rounded-lg text-emerald-200 text-xs sm:text-sm hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-1"
              title="Changer statut"
            >
              <ListChecks className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Statut</span>
            </button>
          )}

          {/* Imprimer — toujours visible */}
          {onPrint && (
            <button
              onClick={() => onPrint(bonCommande)}
              className="flex-1 min-w-[60px] py-1.5 sm:py-2 bg-indigo-500/20 rounded-md sm:rounded-lg text-indigo-200 text-xs sm:text-sm hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-1"
              title="Imprimer"
            >
              <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Imprimer</span>
            </button>
          )}

          {/* Supprimer — si pas LIVRÉ */}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(bonCommande)}
              className="flex-1 min-w-[50px] py-1.5 sm:py-2 bg-red-500/20 rounded-md sm:rounded-lg text-red-200 text-xs sm:text-sm hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1"
              title="Supprimer"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Sup.</span>
            </button>
          )}
        </div>

        {/* Indicateur verrouillage */}
        {isVerrouille && (
          <div className="text-center text-xs text-white/50 italic mt-2">
            🔒 Bon de commande livré — non modifiable
          </div>
        )}
        {isAnnule && (
          <div className="text-center text-xs text-white/50 italic mt-2">
            ✗ Bon de commande annulé
          </div>
        )}

        {/* Effet de brillance sur hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
      </div>
    </motion.div>
  );
};

// Skeleton loading
export const BonCommandeCardSkeleton = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <div className="bg-sky-800/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 animate-pulse border border-sky-700/50">
      <div className="flex justify-between mb-2 sm:mb-3">
        <div>
          <div className="h-4 sm:h-5 bg-white/20 rounded w-28 sm:w-32 mb-1 sm:mb-2" />
          <div className="h-3 sm:h-4 bg-white/20 rounded w-20 sm:w-24" />
        </div>
        <div className="h-5 sm:h-6 bg-white/20 rounded-full w-16 sm:w-20" />
      </div>
      <div className="mb-3 sm:mb-4 space-y-1 sm:space-y-2">
        <div className="h-3 sm:h-4 bg-white/20 rounded w-24 sm:w-28" />
        <div className="h-3 sm:h-4 bg-white/20 rounded w-20 sm:w-24" />
      </div>
      <div className="text-center mb-3 sm:mb-4">
        <div className="h-6 sm:h-8 bg-white/20 rounded w-32 sm:w-40 mx-auto" />
      </div>
      <div className="flex gap-1 sm:gap-2">
        <div className="flex-1 h-7 sm:h-8 bg-white/20 rounded-md sm:rounded-lg" />
        <div className="flex-1 h-7 sm:h-8 bg-white/20 rounded-md sm:rounded-lg" />
        <div className="flex-1 h-7 sm:h-8 bg-white/20 rounded-md sm:rounded-lg" />
      </div>
    </div>
  </motion.div>
);
