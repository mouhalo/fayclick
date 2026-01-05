/**
 * Composant FactureCard avec design glassmorphism
 * Card moderne inspirée de la capture d'écran fournie
 * Intégration avec ModalFacturePrivee - suppression du système dépliable
 */

'use client';

import { motion } from 'framer-motion';
import { Eye, Receipt, CreditCard, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FactureComplete } from '@/types/facture';
import { formatAmount, formatDate, cn } from '@/lib/utils';

interface FactureCardProps {
  facture: FactureComplete;
  onVoirDetailsModal?: (facture: FactureComplete) => void;
  onAjouterAcompte?: (facture: FactureComplete) => void;
  onPartager?: (facture: FactureComplete) => void;
  onVoirRecu?: (facture: FactureComplete) => void;
  onSupprimer?: (facture: FactureComplete) => void;
  delay?: number;
  userProfileId?: number; // ID du profil utilisateur (1 = ADMIN)
}

export const FactureCard = ({
  facture,
  onVoirDetailsModal,
  onAjouterAcompte,
  onPartager,
  onVoirRecu,
  onSupprimer,
  delay = 0,
  userProfileId
}: FactureCardProps) => {
  const { facture: factureData } = facture;

  // Vérifier si l'utilisateur est admin (id_profil = 1)
  const isAdmin = userProfileId === 1;

  // Déterminer si le bouton supprimer doit être affiché
  // ⚠️ SÉCURITÉ : Seul l'ADMIN peut supprimer des factures (payées ou impayées)
  const shouldShowDeleteButton = onSupprimer && isAdmin;

  // Vérification de sécurité pour éviter les erreurs de rendu
  if (!factureData) {
    console.error('❌ [FACTURE-CARD] Données de facture manquantes:', facture);
    return null;
  }

  const handleVoirDetails = () => {
    onVoirDetailsModal?.(facture);
  };

  // Animation variants pour la card
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 12,
        delay,
      },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      layout
      className="w-full"
    >
      <div className="
        bg-slate-900/60 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4
        border border-white/20 hover:bg-slate-800/70 hover:border-blue-400/30
        transition-all duration-300 shadow-lg shadow-blue-900/20
        group relative overflow-hidden
      ">
        {/* En-tête avec numéro de facture et statut */}
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base sm:text-lg tracking-wide truncate pr-2">
              {factureData.num_facture}
            </h3>
            <p className="text-white/80 text-xs sm:text-sm">
              📞 {factureData.tel_client}
            </p>
          </div>

          <StatusBadge
            status={factureData.libelle_etat}
            size="sm"
          />
        </div>

        {/* Informations client */}
        <div className="mb-3 sm:mb-4 space-y-1 sm:space-y-2 text-white/80 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 sm:w-4 sm:h-4">👤</span>
            <span className="font-medium truncate">
              {factureData.nom_client}
              {factureData.mt_remise > 0 && (
                <span className="text-orange-300 ml-1">
                  (Remise: {formatAmount(factureData.mt_remise)})
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 sm:w-4 sm:h-4">📅</span>
            <span className="truncate">{formatDate(factureData.date_facture)}</span>
          </div>
        </div>

        {/* Montant principal responsive */}
        <div className="text-center mb-3 sm:mb-4">
          <p className="text-white text-xl sm:text-2xl font-bold">
            {formatAmount(factureData.montant)}
          </p>
          {factureData.mt_restant > 0 && (
            <p className="text-orange-300 text-xs sm:text-sm font-medium">
              Reste: {formatAmount(factureData.mt_restant)}
            </p>
          )}
        </div>

        {/* Actions responsive */}
        <div className="flex gap-1 sm:gap-2">
          {factureData.libelle_etat === 'IMPAYEE' ? (
            <>
              <button
                onClick={handleVoirDetails}
                className="flex-1 py-1.5 sm:py-2 bg-blue-500/20 rounded-md sm:rounded-lg text-blue-100 text-xs sm:text-sm hover:bg-blue-500/40 transition-colors flex items-center justify-center gap-1 border border-blue-400/20"
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Voir</span>
              </button>

              {shouldShowDeleteButton && (
                <button
                  onClick={() => onSupprimer(facture)}
                  className="flex-1 py-1.5 sm:py-2 bg-red-500/20 rounded-md sm:rounded-lg text-red-200 text-xs sm:text-sm hover:bg-red-500/40 transition-colors flex items-center justify-center gap-1 border border-red-400/20"
                  title="Supprimer la facture"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Sup.</span>
                </button>
              )}

              <button
                onClick={() => onAjouterAcompte?.(facture)}
                className="flex-1 py-1.5 sm:py-2 bg-cyan-500/20 rounded-md sm:rounded-lg text-cyan-100 text-xs sm:text-sm hover:bg-cyan-500/40 transition-colors flex items-center justify-center gap-1 border border-cyan-400/20"
              >
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Payer</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleVoirDetails}
                className="flex-1 py-1.5 sm:py-2 bg-blue-500/20 rounded-md sm:rounded-lg text-blue-100 text-xs sm:text-sm hover:bg-blue-500/40 transition-colors flex items-center justify-center gap-1 border border-blue-400/20"
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Voir</span>
              </button>

              {shouldShowDeleteButton && (
                <button
                  onClick={() => onSupprimer(facture)}
                  className="flex-1 py-1.5 sm:py-2 bg-red-500/20 rounded-md sm:rounded-lg text-red-200 text-xs sm:text-sm hover:bg-red-500/40 transition-colors flex items-center justify-center gap-1 border border-red-400/20"
                  title={isAdmin ? "Supprimer la facture (ADMIN)" : "Supprimer la facture"}
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Sup.</span>
                </button>
              )}

              <button
                onClick={() => onVoirRecu?.(facture)}
                className="flex-1 py-1.5 sm:py-2 bg-cyan-500/20 rounded-md sm:rounded-lg text-cyan-100 text-xs sm:text-sm hover:bg-cyan-500/40 transition-colors flex items-center justify-center gap-1 border border-cyan-400/20"
                title="Voir le reçu de paiement"
              >
                <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Reçu</span>
              </button>
            </>
          )}

        </div>

        {/* Message informatif pour non-admin */}
        {!isAdmin && (
          <div className="text-center text-xs text-white/50 italic mt-2">
            🔒 Suppression réservée à l&apos;Administrateur
          </div>
        )}

        {/* Effet de brillance sur hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
      </div>
    </motion.div>
  );
};

// Composant de loading skeleton - style glassmorphe harmonisé
export const FactureCardSkeleton = ({ delay = 0 }: { delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="
        bg-slate-900/60 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 animate-pulse
        border border-white/20 shadow-lg shadow-blue-900/20
      ">
        <div className="flex justify-between mb-2 sm:mb-3">
          <div>
            <div className="h-4 sm:h-5 bg-white/20 rounded w-28 sm:w-32 mb-1 sm:mb-2"></div>
            <div className="h-3 sm:h-4 bg-white/20 rounded w-20 sm:w-24"></div>
          </div>
          <div className="h-5 sm:h-6 bg-white/20 rounded-full w-12 sm:w-16"></div>
        </div>

        <div className="mb-3 sm:mb-4 space-y-1 sm:space-y-2">
          <div className="h-3 sm:h-4 bg-white/20 rounded w-24 sm:w-28"></div>
          <div className="h-3 sm:h-4 bg-white/20 rounded w-20 sm:w-24"></div>
        </div>

        <div className="text-center mb-3 sm:mb-4">
          <div className="h-6 sm:h-8 bg-white/20 rounded w-32 sm:w-40 mx-auto mb-1"></div>
          <div className="h-3 sm:h-4 bg-white/20 rounded w-20 sm:w-24 mx-auto"></div>
        </div>

        <div className="flex gap-1 sm:gap-2">
          <div className="flex-1 h-7 sm:h-8 bg-white/20 rounded-md sm:rounded-lg"></div>
          <div className="flex-1 h-7 sm:h-8 bg-white/20 rounded-md sm:rounded-lg"></div>
          <div className="flex-1 h-7 sm:h-8 bg-white/20 rounded-md sm:rounded-lg"></div>
        </div>
      </div>
    </motion.div>
  );
};