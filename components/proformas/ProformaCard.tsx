/**
 * Composant ProformaCard avec design glassmorphism
 * Card pour afficher une proforma dans la liste
 */

'use client';

import { motion } from 'framer-motion';
import { Eye, Pencil, Printer, Trash2, FileOutput, Share2 } from 'lucide-react';
import { ProformaStatusBadge } from './ProformaStatusBadge';
import { Proforma } from '@/types/proforma';
import { formatAmount, formatDate } from '@/lib/utils';

interface ProformaCardProps {
  proforma: Proforma;
  onVoirDetails?: (proforma: Proforma) => void;
  onModifier?: (proforma: Proforma) => void;
  onImprimer?: (proforma: Proforma) => void;
  onPartager?: (proforma: Proforma) => void;
  onConvertir?: (proforma: Proforma) => void;
  onSupprimer?: (proforma: Proforma) => void;
  delay?: number;
  canViewMontants?: boolean;
}

export const ProformaCard = ({
  proforma,
  onVoirDetails,
  onModifier,
  onImprimer,
  onPartager,
  onConvertir,
  onSupprimer,
  delay = 0,
  canViewMontants = true
}: ProformaCardProps) => {
  const isConvertie = proforma.libelle_etat === 'CONVERTIE';

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1, y: 0, scale: 1,
      transition: { type: "spring" as const, stiffness: 100, damping: 12, delay },
    },
  };

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" layout className="w-full">
      <div className="
        bg-amber-800/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4
        border border-amber-700/50 hover:bg-amber-800
        transition-all duration-200
        group relative overflow-hidden
      ">
        {/* En-tete avec numero et statut */}
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base sm:text-lg tracking-wide truncate pr-2">
              {proforma.num_proforma}
            </h3>
            <p className="text-white/80 text-xs sm:text-sm">
              {proforma.nb_articles} article{proforma.nb_articles > 1 ? 's' : ''}
            </p>
          </div>
          <ProformaStatusBadge status={proforma.libelle_etat} size="sm" />
        </div>

        {/* Informations client */}
        <div className="mb-3 sm:mb-4 space-y-1 sm:space-y-2 text-white/80 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 sm:w-4 sm:h-4">👤</span>
            <span className="font-medium truncate">
              {proforma.nom_client}
              {proforma.mt_remise > 0 && (
                <span className="text-orange-300 ml-1">
                  (Remise: {canViewMontants ? formatAmount(proforma.mt_remise) : '******'})
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 sm:w-4 sm:h-4">📞</span>
            <span>{proforma.tel_client}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 sm:w-4 sm:h-4">📅</span>
            <span>{formatDate(proforma.date_proforma)}</span>
          </div>
        </div>

        {/* Montant principal */}
        <div className="text-center mb-3 sm:mb-4">
          <p className="text-white text-xl sm:text-2xl font-bold">
            {canViewMontants ? formatAmount(proforma.montant_net) : '******'}
          </p>
          {isConvertie && proforma.id_facture_liee && (
            <p className="text-violet-300 text-xs sm:text-sm font-medium">
              Facture liee #{proforma.id_facture_liee}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 sm:gap-2">
          {/* Voir details - toujours visible */}
          <button
            onClick={() => onVoirDetails?.(proforma)}
            className="flex-1 py-1.5 sm:py-2 bg-white/20 rounded-md sm:rounded-lg text-white text-xs sm:text-sm hover:bg-white/30 transition-colors flex items-center justify-center gap-1"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Voir</span>
          </button>

          {/* Modifier - si pas convertie */}
          {!isConvertie && onModifier && (
            <button
              onClick={() => onModifier(proforma)}
              className="flex-1 py-1.5 sm:py-2 bg-blue-500/20 rounded-md sm:rounded-lg text-blue-200 text-xs sm:text-sm hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-1"
            >
              <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Modifier</span>
            </button>
          )}

          {/* Convertir en facture - si pas convertie */}
          {!isConvertie && onConvertir && (
            <button
              onClick={() => onConvertir(proforma)}
              className="flex-1 py-1.5 sm:py-2 bg-emerald-500/20 rounded-md sm:rounded-lg text-emerald-200 text-xs sm:text-sm hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-1"
            >
              <FileOutput className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Facturer</span>
            </button>
          )}

          {/* Imprimer - toujours visible */}
          {onImprimer && (
            <button
              onClick={() => onImprimer(proforma)}
              className="flex-1 py-1.5 sm:py-2 bg-indigo-500/20 rounded-md sm:rounded-lg text-indigo-200 text-xs sm:text-sm hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-1"
            >
              <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Imprimer</span>
            </button>
          )}

          {/* Supprimer - si pas convertie */}
          {!isConvertie && onSupprimer && (
            <button
              onClick={() => onSupprimer(proforma)}
              className="flex-1 py-1.5 sm:py-2 bg-red-500/20 rounded-md sm:rounded-lg text-red-200 text-xs sm:text-sm hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Sup.</span>
            </button>
          )}
        </div>

        {/* Indicateur convertie */}
        {isConvertie && (
          <div className="text-center text-xs text-white/50 italic mt-2">
            🔒 Proforma convertie en facture — non modifiable
          </div>
        )}

        {/* Effet de brillance sur hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
      </div>
    </motion.div>
  );
};

// Skeleton loading
export const ProformaCardSkeleton = ({ delay = 0 }: { delay?: number }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <div className="bg-amber-800/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 animate-pulse border border-amber-700/50">
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
